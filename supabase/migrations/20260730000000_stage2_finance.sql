-- Merx Stage 2: invoices, payments, digital receipts

create type public.payment_method as enum ('cash', 'mpesa', 'bank', 'card', 'other');
create type public.payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'void');
create type public.receipt_status as enum ('issued', 'void');

alter table public.orders
  add column if not exists amount_paid numeric(14,2) not null default 0,
  add column if not exists payment_status text not null default 'unpaid';

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  invoice_number text not null,
  status public.invoice_status not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  issued_at timestamptz,
  due_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create index invoices_business_order_idx on public.invoices (business_id, order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  status public.payment_status not null default 'completed',
  reference text,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index payments_business_order_idx on public.payments (business_id, order_id);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete cascade,
  receipt_number text not null,
  status public.receipt_status not null default 'issued',
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (business_id, receipt_number),
  unique (payment_id)
);

create index receipts_business_order_idx on public.receipts (business_id, order_id);

create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- Number helpers
create or replace function public.next_invoice_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from public.invoices where business_id = p_business_id;
  return 'INV-' || lpad(seq::text, 5, '0');
end;
$$;

create or replace function public.next_receipt_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from public.receipts where business_id = p_business_id;
  return 'RCP-' || lpad(seq::text, 5, '0');
end;
$$;

create or replace function public.refresh_order_payment_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid numeric(14,2);
  ord_total numeric(14,2);
  new_status text;
begin
  select coalesce(sum(amount), 0) into paid
  from public.payments
  where order_id = p_order_id and status = 'completed';

  select total into ord_total from public.orders where id = p_order_id;

  if paid <= 0 then
    new_status := 'unpaid';
  elsif paid + 0.001 < coalesce(ord_total, 0) then
    new_status := 'partial';
  else
    new_status := 'paid';
  end if;

  update public.orders
  set amount_paid = paid,
      payment_status = new_status
  where id = p_order_id;

  update public.invoices
  set status = case
    when new_status = 'paid' then 'paid'::public.invoice_status
    when status = 'void' then 'void'::public.invoice_status
    when status = 'draft' then 'draft'::public.invoice_status
    else 'issued'::public.invoice_status
  end
  where order_id = p_order_id
    and status is distinct from 'void';
end;
$$;

create or replace function public.create_invoice_from_order(p_order_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
  inv public.invoices;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into ord from public.orders where id = p_order_id;
  if ord.id is null then
    raise exception 'Order not found';
  end if;

  if not public.has_business_role(ord.business_id, array['admin','manager','sales']::public.staff_role[]) then
    raise exception 'Not allowed to create invoices';
  end if;

  if exists (
    select 1 from public.invoices
    where order_id = p_order_id and status is distinct from 'void'
  ) then
    select * into inv from public.invoices
    where order_id = p_order_id and status is distinct from 'void'
    order by created_at desc
    limit 1;
    return inv;
  end if;

  insert into public.invoices (
    business_id, order_id, invoice_number, status,
    subtotal, tax_amount, discount_amount, total,
    issued_at, created_by
  )
  values (
    ord.business_id,
    ord.id,
    public.next_invoice_number(ord.business_id),
    'issued',
    ord.subtotal,
    ord.tax_amount,
    ord.discount_amount,
    ord.total,
    now(),
    auth.uid()
  )
  returning * into inv;

  return inv;
end;
$$;

create or replace function public.record_payment(
  p_order_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_invoice_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders;
  pay public.payments;
  rcp public.receipts;
  inv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into ord from public.orders where id = p_order_id;
  if ord.id is null then
    raise exception 'Order not found';
  end if;

  if not public.has_business_role(ord.business_id, array['admin','manager','sales']::public.staff_role[]) then
    raise exception 'Not allowed to record payments';
  end if;

  inv_id := p_invoice_id;
  if inv_id is null then
    select id into inv_id
    from public.invoices
    where order_id = p_order_id and status is distinct from 'void'
    order by created_at desc
    limit 1;
  end if;

  insert into public.payments (
    business_id, order_id, invoice_id, amount, method, status,
    reference, notes, created_by
  )
  values (
    ord.business_id, ord.id, inv_id, p_amount, p_method, 'completed',
    nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid()
  )
  returning * into pay;

  insert into public.receipts (
    business_id, order_id, payment_id, receipt_number, created_by
  )
  values (
    ord.business_id,
    ord.id,
    pay.id,
    public.next_receipt_number(ord.business_id),
    auth.uid()
  )
  returning * into rcp;

  perform public.refresh_order_payment_status(ord.id);

  return jsonb_build_object(
    'payment_id', pay.id,
    'receipt_id', rcp.id,
    'receipt_number', rcp.receipt_number
  );
end;
$$;

-- RLS
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;

create policy "Members read invoices"
  on public.invoices for select using (public.is_business_member(business_id));
create policy "Staff write invoices"
  on public.invoices for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

create policy "Members read payments"
  on public.payments for select using (public.is_business_member(business_id));
create policy "Staff write payments"
  on public.payments for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

create policy "Members read receipts"
  on public.receipts for select using (public.is_business_member(business_id));
create policy "Staff write receipts"
  on public.receipts for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

revoke all on function public.next_invoice_number(uuid) from public, anon;
revoke all on function public.next_receipt_number(uuid) from public, anon;
revoke all on function public.refresh_order_payment_status(uuid) from public, anon, authenticated;
revoke all on function public.create_invoice_from_order(uuid) from public, anon;
revoke all on function public.record_payment(uuid, numeric, public.payment_method, text, text, uuid) from public, anon;

grant execute on function public.next_invoice_number(uuid) to authenticated;
grant execute on function public.next_receipt_number(uuid) to authenticated;
grant execute on function public.create_invoice_from_order(uuid) to authenticated;
grant execute on function public.record_payment(uuid, numeric, public.payment_method, text, text, uuid) to authenticated;

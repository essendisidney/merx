-- Branch stock + transfer-aware inventory trigger

create table if not exists public.branch_stock (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists branch_stock_unique_idx
  on public.branch_stock (
    branch_id,
    product_id,
    coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists branch_stock_business_product_idx
  on public.branch_stock (business_id, product_id);

alter table public.branch_stock enable row level security;

drop policy if exists "Members read branch stock" on public.branch_stock;
create policy "Members read branch stock"
  on public.branch_stock for select
  using (public.is_business_member(business_id));

drop policy if exists "Staff write branch stock" on public.branch_stock;
create policy "Staff write branch stock"
  on public.branch_stock for all
  using (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create or replace function public.adjust_branch_stock(
  p_business_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  if p_branch_id is null then
    return;
  end if;

  if p_variant_id is null then
    select id into existing_id
    from public.branch_stock
    where branch_id = p_branch_id
      and product_id = p_product_id
      and variant_id is null
    limit 1;
  else
    select id into existing_id
    from public.branch_stock
    where branch_id = p_branch_id
      and product_id = p_product_id
      and variant_id = p_variant_id
    limit 1;
  end if;

  if existing_id is null then
    insert into public.branch_stock (business_id, branch_id, product_id, variant_id, quantity)
    values (p_business_id, p_branch_id, p_product_id, p_variant_id, p_delta);
  else
    update public.branch_stock
    set quantity = quantity + p_delta,
        updated_at = now()
    where id = existing_id;
  end if;
end;
$$;

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  product_delta numeric(14,3);
begin
  if new.movement_type = 'stock_in' then
    product_delta := new.quantity;
    perform public.adjust_branch_stock(
      new.business_id, new.branch_id, new.product_id, new.variant_id, new.quantity
    );
  elsif new.movement_type = 'stock_out' then
    product_delta := -new.quantity;
    perform public.adjust_branch_stock(
      new.business_id, new.branch_id, new.product_id, new.variant_id, -new.quantity
    );
  elsif new.movement_type = 'adjustment' then
    product_delta := new.quantity;
    perform public.adjust_branch_stock(
      new.business_id, new.branch_id, new.product_id, new.variant_id, new.quantity
    );
  elsif new.movement_type = 'transfer' then
    product_delta := 0;
    perform public.adjust_branch_stock(
      new.business_id, new.branch_id, new.product_id, new.variant_id, -new.quantity
    );
    perform public.adjust_branch_stock(
      new.business_id, new.to_branch_id, new.product_id, new.variant_id, new.quantity
    );
  else
    product_delta := 0;
  end if;

  if new.variant_id is not null and product_delta <> 0 then
    update public.product_variants
    set stock_quantity = stock_quantity + product_delta
    where id = new.variant_id;
  end if;

  if product_delta <> 0 then
    update public.products
    set stock_quantity = stock_quantity + product_delta
    where id = new.product_id;
  end if;

  insert into public.notifications (business_id, type, title, body, link)
  select
    p.business_id,
    'low_stock',
    'Low stock: ' || p.name,
    'Stock is at ' || p.stock_quantity::text || ' (reorder level ' || p.reorder_level::text || ')',
    '/products/' || p.id::text
  from public.products p
  where p.id = new.product_id
    and p.reorder_level > 0
    and p.stock_quantity <= p.reorder_level
    and product_delta <> 0;

  return new;
end;
$$;

insert into public.branch_stock (business_id, branch_id, product_id, quantity)
select p.business_id, b.id, p.id, p.stock_quantity
from public.products p
join public.branches b on b.business_id = p.business_id and b.is_main = true
where p.stock_quantity <> 0
  and not exists (
    select 1 from public.branch_stock bs
    where bs.branch_id = b.id and bs.product_id = p.id and bs.variant_id is null
  );

revoke all on function public.adjust_branch_stock(uuid, uuid, uuid, uuid, numeric) from public, anon, authenticated;

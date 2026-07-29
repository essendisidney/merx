-- Merx Stage 1 schema: multi-tenant commerce OS
-- businesses, users, products, inventory, customers, orders, notifications

create extension if not exists "pgcrypto";

-- Enums
create type public.staff_role as enum ('admin', 'manager', 'sales', 'inventory');
create type public.customer_type as enum ('individual', 'business', 'wholesale');
create type public.order_status as enum (
  'draft',
  'quotation',
  'approved',
  'order',
  'completed',
  'cancelled'
);
create type public.inventory_movement_type as enum (
  'stock_in',
  'stock_out',
  'transfer',
  'adjustment'
);
create type public.notification_type as enum (
  'low_stock',
  'new_order',
  'new_customer',
  'order_completed',
  'general'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Businesses (tenants)
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text,
  phone text,
  address text,
  city text,
  country text default 'KE',
  currency text not null default 'KES',
  tax_rate numeric(5,2) not null default 16.00,
  logo_url text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  code text,
  address text,
  phone text,
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null default 'sales',
  branch_id uuid references public.branches (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Categories & brands
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  category_id uuid references public.categories (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  description text,
  image_url text,
  cost_price numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  tax_rate numeric(5,2),
  stock_quantity numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  unit text not null default 'pcs',
  has_variants boolean not null default false,
  track_batch boolean not null default false,
  track_expiry boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_business_sku_idx
  on public.products (business_id, sku)
  where sku is not null;

create unique index products_business_barcode_idx
  on public.products (business_id, barcode)
  where barcode is not null;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  colour text,
  size text,
  cost_price numeric(14,2),
  selling_price numeric(14,2),
  stock_quantity numeric(14,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Inventory
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  to_branch_id uuid references public.branches (id) on delete set null,
  movement_type public.inventory_movement_type not null,
  quantity numeric(14,3) not null,
  batch_number text,
  expiry_date date,
  notes text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  company text,
  customer_type public.customer_type not null default 'individual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_business_phone_idx on public.customers (business_id, phone);
create index customers_business_name_idx on public.customers (business_id, name);

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  order_number text not null,
  status public.order_status not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  quotation_date date,
  order_date date,
  completed_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, order_number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  sku text,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Notifications & activity
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type public.notification_type not null default 'general',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helper: membership check (security definer, private schema pattern via search_path)
create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.has_business_role(
  p_business_id uuid,
  p_roles public.staff_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any (p_roles)
  );
$$;

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Order number sequence helper
create or replace function public.next_order_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq
  from public.orders
  where business_id = p_business_id;
  return 'ORD-' || lpad(seq::text, 5, '0');
end;
$$;

-- Apply inventory movement to product stock
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(14,3);
begin
  if new.movement_type in ('stock_in') then
    delta := new.quantity;
  elsif new.movement_type in ('stock_out') then
    delta := -new.quantity;
  elsif new.movement_type = 'adjustment' then
    delta := new.quantity; -- signed quantity
  elsif new.movement_type = 'transfer' then
    delta := -new.quantity; -- leave source; destination handled separately if needed
  else
    delta := 0;
  end if;

  if new.variant_id is not null then
    update public.product_variants
    set stock_quantity = stock_quantity + delta
    where id = new.variant_id;
  end if;

  update public.products
  set stock_quantity = stock_quantity + delta
  where id = new.product_id;

  -- Low stock notification (stock already updated above)
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
    and p.stock_quantity <= p.reorder_level;

  return new;
end;
$$;

create trigger inventory_movement_apply
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- Deduct stock when order completed
create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();

    insert into public.inventory_movements (
      business_id, product_id, variant_id, movement_type, quantity,
      notes, reference_type, reference_id, created_by
    )
    select
      oi.business_id,
      oi.product_id,
      oi.variant_id,
      'stock_out',
      oi.quantity,
      'Order ' || new.order_number,
      'order',
      new.id,
      new.created_by
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id is not null;

    insert into public.notifications (business_id, type, title, body, link)
    values (
      new.business_id,
      'order_completed',
      'Order completed: ' || new.order_number,
      'Order marked as completed',
      '/sales/orders/' || new.id::text
    );
  end if;

  if new.status = 'order' and old.status is distinct from 'order' then
    insert into public.notifications (business_id, type, title, body, link)
    values (
      new.business_id,
      'new_order',
      'New order: ' || new.order_number,
      'Order converted / created',
      '/sales/orders/' || new.id::text
    );
  end if;

  return new;
end;
$$;

create trigger orders_status_change
  before update on public.orders
  for each row execute function public.handle_order_status_change();

-- Notify on new customer
create or replace function public.notify_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (business_id, type, title, body, link)
  values (
    new.business_id,
    'new_customer',
    'New customer: ' || new.name,
    coalesce(new.phone, new.email, 'Customer created'),
    '/customers/' || new.id::text
  );
  return new;
end;
$$;

create trigger customers_notify
  after insert on public.customers
  for each row execute function public.notify_new_customer();

-- Create business with owner membership + main branch
create or replace function public.create_business(
  p_name text,
  p_slug text,
  p_currency text default 'KES'
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  biz public.businesses;
  branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.businesses (name, slug, currency, created_by)
  values (p_name, p_slug, p_currency, auth.uid())
  returning * into biz;

  insert into public.branches (business_id, name, code, is_main)
  values (biz.id, 'Main', 'MAIN', true)
  returning id into branch_id;

  insert into public.business_members (business_id, user_id, role, branch_id)
  values (biz.id, auth.uid(), 'admin', branch_id);

  return biz;
end;
$$;

grant execute on function public.create_business(text, text, text) to authenticated;
grant execute on function public.next_order_number(uuid) to authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.staff_role[]) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.business_members enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

-- Businesses
create policy "Members can view business"
  on public.businesses for select
  using (public.is_business_member(id));
create policy "Authenticated can create business"
  on public.businesses for insert
  with check (auth.uid() = created_by);
create policy "Admins can update business"
  on public.businesses for update
  using (public.has_business_role(id, array['admin'::public.staff_role]::public.staff_role[]));

-- Members
create policy "Members can view memberships"
  on public.business_members for select
  using (public.is_business_member(business_id) or user_id = auth.uid());
create policy "Admins can manage members"
  on public.business_members for all
  using (public.has_business_role(business_id, array['admin'::public.staff_role]::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin'::public.staff_role]::public.staff_role[]));
-- Allow insert of self as admin during create_business (security definer bypasses RLS)
-- Also allow user to see their own membership rows for bootstrap
create policy "Users can insert self membership via function"
  on public.business_members for insert
  with check (user_id = auth.uid());

-- Branches
create policy "Members can view branches"
  on public.branches for select using (public.is_business_member(business_id));
create policy "Admins manage branches"
  on public.branches for all
  using (public.has_business_role(business_id, array['admin','manager']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager']::public.staff_role[]));

-- Shared tenant policies for catalogue tables
create policy "Members read categories"
  on public.categories for select using (public.is_business_member(business_id));
create policy "Staff write categories"
  on public.categories for all
  using (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create policy "Members read brands"
  on public.brands for select using (public.is_business_member(business_id));
create policy "Staff write brands"
  on public.brands for all
  using (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create policy "Members read products"
  on public.products for select using (public.is_business_member(business_id));
create policy "Staff write products"
  on public.products for all
  using (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create policy "Members read variants"
  on public.product_variants for select using (public.is_business_member(business_id));
create policy "Staff write variants"
  on public.product_variants for all
  using (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create policy "Members read inventory"
  on public.inventory_movements for select using (public.is_business_member(business_id));
create policy "Staff write inventory"
  on public.inventory_movements for insert
  with check (public.has_business_role(business_id, array['admin','manager','inventory']::public.staff_role[]));

create policy "Members read customers"
  on public.customers for select using (public.is_business_member(business_id));
create policy "Staff write customers"
  on public.customers for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

create policy "Members read orders"
  on public.orders for select using (public.is_business_member(business_id));
create policy "Staff write orders"
  on public.orders for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

create policy "Members read order items"
  on public.order_items for select using (public.is_business_member(business_id));
create policy "Staff write order items"
  on public.order_items for all
  using (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]))
  with check (public.has_business_role(business_id, array['admin','manager','sales']::public.staff_role[]));

create policy "Members read notifications"
  on public.notifications for select
  using (
    public.is_business_member(business_id)
    and (user_id is null or user_id = auth.uid())
  );
create policy "Members update notifications"
  on public.notifications for update
  using (
    public.is_business_member(business_id)
    and (user_id is null or user_id = auth.uid())
  );
create policy "System insert notifications"
  on public.notifications for insert
  with check (public.is_business_member(business_id));

create policy "Members read activity"
  on public.activity_logs for select using (public.is_business_member(business_id));
create policy "Members insert activity"
  on public.activity_logs for insert with check (public.is_business_member(business_id));

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Members can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Authenticated can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "Authenticated can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "Authenticated can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

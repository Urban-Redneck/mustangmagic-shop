-- Store actual upstream inventory quantities separately from item metadata.
-- products.warehouse_availability from item imports only says whether an item
-- can be ordered from a location; it is not a stock quantity.

alter table public.products
add column if not exists inventory_quantity integer,
add column if not exists inventory_updated_at timestamptz,
add column if not exists inventory_eta jsonb,
add column if not exists raw_turn14_inventory_json jsonb;

alter table public.products
drop constraint if exists products_inventory_quantity_non_negative;

alter table public.products
add constraint products_inventory_quantity_non_negative
check (inventory_quantity is null or inventory_quantity >= 0);

alter table public.products
drop constraint if exists products_inventory_eta_object;

alter table public.products
add constraint products_inventory_eta_object
check (
  inventory_eta is null
  or jsonb_typeof(inventory_eta) = 'object'
);

alter table public.products
drop constraint if exists products_raw_turn14_inventory_json_object;

alter table public.products
add constraint products_raw_turn14_inventory_json_object
check (
  raw_turn14_inventory_json is null
  or jsonb_typeof(raw_turn14_inventory_json) = 'object'
);

create index if not exists products_inventory_quantity_idx
on public.products (inventory_quantity)
where inventory_quantity is not null;

create index if not exists products_inventory_updated_at_idx
on public.products (inventory_updated_at)
where inventory_updated_at is not null;

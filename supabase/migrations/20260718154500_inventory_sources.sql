-- Track per-vendor cost and availability for each storefront product.

create table if not exists public.inventory_sources (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_name text not null,
  vendor_sku text not null,
  cost_price numeric(12, 2),
  stock_quantity integer,
  updated_at timestamptz not null default now(),

  constraint inventory_sources_vendor_name_supported
  check (vendor_name in ('turn14', 'atech')),
  constraint inventory_sources_vendor_sku_not_blank
  check (length(btrim(vendor_sku)) > 0),
  constraint inventory_sources_cost_price_non_negative
  check (cost_price is null or cost_price >= 0),
  constraint inventory_sources_stock_quantity_non_negative
  check (stock_quantity is null or stock_quantity >= 0),
  constraint inventory_sources_product_vendor_unique
  unique (product_id, vendor_name),
  constraint inventory_sources_vendor_sku_unique
  unique (vendor_name, vendor_sku)
);

drop trigger if exists inventory_sources_set_updated_at on public.inventory_sources;

create trigger inventory_sources_set_updated_at
before update on public.inventory_sources
for each row execute function public.set_updated_at();

create index if not exists inventory_sources_product_id_idx
on public.inventory_sources (product_id);

create index if not exists inventory_sources_vendor_name_idx
on public.inventory_sources (vendor_name);

create index if not exists inventory_sources_stock_quantity_idx
on public.inventory_sources (stock_quantity)
where stock_quantity is not null;

grant select, insert, update, delete on table public.inventory_sources to service_role;
grant usage, select on sequence public.inventory_sources_id_seq to service_role;

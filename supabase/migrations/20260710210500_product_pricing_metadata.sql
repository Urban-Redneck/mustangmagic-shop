-- Store internal Turn14 pricing metadata alongside public storefront prices.
-- Public price fields remain:
--   products.price     = storefront sell price, MAP when present otherwise Retail
--   products.map_price = Turn14 MAP
--   products.msrp      = Turn14 Retail

alter table public.products
add column if not exists purchase_cost numeric(12, 2),
add column if not exists can_purchase boolean,
add column if not exists has_map boolean,
add column if not exists pricing_updated_at timestamptz,
add column if not exists raw_turn14_pricing_json jsonb;

alter table public.products
drop constraint if exists products_purchase_cost_non_negative;

alter table public.products
add constraint products_purchase_cost_non_negative
check (purchase_cost is null or purchase_cost >= 0);

alter table public.products
drop constraint if exists products_raw_turn14_pricing_json_object;

alter table public.products
add constraint products_raw_turn14_pricing_json_object
check (
  raw_turn14_pricing_json is null
  or jsonb_typeof(raw_turn14_pricing_json) = 'object'
);

create index if not exists products_can_purchase_idx
on public.products (can_purchase)
where can_purchase is not null;

create index if not exists products_pricing_updated_at_idx
on public.products (pricing_updated_at)
where pricing_updated_at is not null;

-- MustangMagic.store initial catalog schema
-- Scope: curated Mustang parts catalog sourced from Turn14.
-- Excludes: auth, users, carts, checkout, payments, and orders.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  turn14_id text,
  name text not null,
  slug text not null,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint brands_turn14_id_unique unique (turn14_id),
  constraint brands_slug_unique unique (slug),
  constraint brands_name_not_blank check (length(btrim(name)) > 0),
  constraint brands_slug_not_blank check (length(btrim(slug)) > 0)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_slug_unique unique (slug),
  constraint categories_name_not_blank check (length(btrim(name)) > 0),
  constraint categories_slug_not_blank check (length(btrim(slug)) > 0),
  constraint categories_not_own_parent check (parent_id is null or parent_id <> id)
);

create table public.mustang_generations (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  start_year integer not null,
  end_year integer,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mustang_generations_slug_unique unique (slug),
  constraint mustang_generations_name_unique unique (name),
  constraint mustang_generations_slug_not_blank check (length(btrim(slug)) > 0),
  constraint mustang_generations_name_not_blank check (length(btrim(name)) > 0),
  constraint mustang_generations_year_range_valid check (
    start_year >= 1964
    and (end_year is null or end_year >= start_year)
  )
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  turn14_id text not null,
  brand_id uuid references public.brands(id) on delete restrict,
  part_number text not null,
  manufacturer_part_number text,
  alternate_part_number text,
  barcode text,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  turn14_category text,
  turn14_subcategory text,
  primary_image_url text,
  price numeric(12, 2),
  map_price numeric(12, 2),
  msrp numeric(12, 2),
  price_group_id integer,
  price_group text,
  inventory_status text not null default 'unknown',
  active boolean not null default false,
  storefront_visible boolean not null default false,
  featured boolean not null default false,
  discontinued boolean not null default false,
  born_on_date date,
  regular_stock boolean,
  powersports_indicator boolean,
  dropship_controller_id integer,
  air_freight_prohibited boolean,
  not_carb_approved boolean,
  carb_acknowledgement_required boolean,
  carb_eo_number text,
  ltl_freight_required boolean,
  prop_65 text,
  epa text,
  units_per_sku integer,
  clearance_item boolean,
  dimensions jsonb not null default '[]'::jsonb,
  warehouse_availability jsonb not null default '[]'::jsonb,
  contents jsonb not null default '[]'::jsonb,
  raw_turn14_json jsonb,
  turn14_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_turn14_id_unique unique (turn14_id),
  constraint products_slug_unique unique (slug),
  constraint products_turn14_id_not_blank check (length(btrim(turn14_id)) > 0),
  constraint products_part_number_not_blank check (length(btrim(part_number)) > 0),
  constraint products_name_not_blank check (length(btrim(name)) > 0),
  constraint products_slug_not_blank check (length(btrim(slug)) > 0),
  constraint products_units_per_sku_positive check (units_per_sku is null or units_per_sku > 0),
  constraint products_price_non_negative check (price is null or price >= 0),
  constraint products_map_price_non_negative check (map_price is null or map_price >= 0),
  constraint products_msrp_non_negative check (msrp is null or msrp >= 0),
  constraint products_dimensions_array check (jsonb_typeof(dimensions) = 'array'),
  constraint products_warehouse_availability_array check (jsonb_typeof(warehouse_availability) = 'array'),
  constraint products_contents_array check (jsonb_typeof(contents) = 'array'),
  constraint products_raw_turn14_json_object check (
    raw_turn14_json is null or jsonb_typeof(raw_turn14_json) = 'object'
  ),
  constraint products_inventory_status_valid check (
    inventory_status in (
      'unknown',
      'in_stock',
      'low_stock',
      'out_of_stock',
      'discontinued',
      'special_order'
    )
  )
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_categories_product_category_unique unique (product_id, category_id)
);

create table public.product_fitments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  generation_id uuid references public.mustang_generations(id) on delete restrict,
  year integer not null,
  make text not null default 'Ford',
  model text not null default 'Mustang',
  trim text,
  engine text,
  notes text,
  source text not null default 'turn14',
  source_fitment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_fitments_year_valid check (year >= 1964),
  constraint product_fitments_make_not_blank check (length(btrim(make)) > 0),
  constraint product_fitments_model_not_blank check (length(btrim(model)) > 0),
  constraint product_fitments_source_not_blank check (length(btrim(source)) > 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  turn14_id text,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_images_url_not_blank check (length(btrim(url)) > 0),
  constraint product_images_width_positive check (width is null or width > 0),
  constraint product_images_height_positive check (height is null or height > 0),
  constraint product_images_product_url_unique unique (product_id, url)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'turn14',
  sync_type text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_seen integer not null default 0,
  records_upserted integer not null default 0,
  records_failed integer not null default 0,
  error text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sync_runs_source_not_blank check (length(btrim(source)) > 0),
  constraint sync_runs_sync_type_valid check (
    sync_type in (
      'brands',
      'categories',
      'fitments',
      'full',
      'images',
      'inventory',
      'pricing',
      'products'
    )
  ),
  constraint sync_runs_status_valid check (
    status in ('running', 'succeeded', 'failed', 'partial')
  ),
  constraint sync_runs_counts_non_negative check (
    records_seen >= 0
    and records_upserted >= 0
    and records_failed >= 0
  ),
  constraint sync_runs_completed_after_started check (
    completed_at is null or completed_at >= started_at
  )
);

alter table public.products
add column search_document tsvector generated always as (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(part_number, '') || ' ' ||
    coalesce(manufacturer_part_number, '') || ' ' ||
    coalesce(alternate_part_number, '') || ' ' ||
    coalesce(barcode, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger mustang_generations_set_updated_at
before update on public.mustang_generations
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_categories_set_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

create trigger product_fitments_set_updated_at
before update on public.product_fitments
for each row execute function public.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

create trigger sync_runs_set_updated_at
before update on public.sync_runs
for each row execute function public.set_updated_at();

create index brands_slug_idx on public.brands (slug);
create index brands_turn14_id_idx on public.brands (turn14_id) where turn14_id is not null;

create index categories_slug_idx on public.categories (slug);
create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_sort_order_idx on public.categories (is_active, sort_order);

create index mustang_generations_slug_idx on public.mustang_generations (slug);
create index mustang_generations_year_range_idx
on public.mustang_generations (start_year, end_year);
create index mustang_generations_sort_order_idx on public.mustang_generations (sort_order);

create index products_slug_idx on public.products (slug);
create index products_turn14_id_idx on public.products (turn14_id);
create index products_brand_id_idx on public.products (brand_id);
create index products_part_number_idx on public.products (part_number);
create index products_manufacturer_part_number_idx
on public.products (manufacturer_part_number)
where manufacturer_part_number is not null;
create index products_alternate_part_number_idx
on public.products (alternate_part_number)
where alternate_part_number is not null;
create index products_barcode_idx on public.products (barcode)
where barcode is not null;
create index products_turn14_category_subcategory_idx
on public.products (turn14_category, turn14_subcategory);
create index products_active_idx on public.products (active);
create index products_storefront_visible_idx on public.products (storefront_visible);
create index products_active_storefront_visible_idx
on public.products (active, storefront_visible);
create index products_inventory_status_idx on public.products (inventory_status);
create index products_featured_idx on public.products (featured) where featured = true;
create index products_price_idx on public.products (price);
create index products_search_document_idx on public.products using gin (search_document);
create index products_raw_turn14_json_idx on public.products using gin (raw_turn14_json);
create index products_turn14_updated_at_idx
on public.products (turn14_updated_at)
where turn14_updated_at is not null;
create unique index products_brand_part_number_unique_idx
on public.products (brand_id, part_number)
where brand_id is not null;

create index product_categories_product_id_idx on public.product_categories (product_id);
create index product_categories_category_id_idx on public.product_categories (category_id);
create unique index product_categories_one_primary_per_product_idx
on public.product_categories (product_id)
where is_primary;

create index product_fitments_product_id_idx on public.product_fitments (product_id);
create index product_fitments_generation_id_idx on public.product_fitments (generation_id);
create index product_fitments_year_idx on public.product_fitments (year);
create index product_fitments_generation_year_idx
on public.product_fitments (generation_id, year);
create index product_fitments_engine_idx on public.product_fitments (engine)
where engine is not null;
create index product_fitments_source_fitment_id_idx
on public.product_fitments (source, source_fitment_id)
where source_fitment_id is not null;
create unique index product_fitments_dedupe_idx
on public.product_fitments (
  product_id,
  year,
  make,
  model,
  coalesce(trim, ''),
  coalesce(engine, ''),
  coalesce(source_fitment_id, '')
);

create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_turn14_id_idx on public.product_images (turn14_id)
where turn14_id is not null;
create index product_images_product_sort_order_idx
on public.product_images (product_id, sort_order);
create unique index product_images_product_turn14_id_unique_idx
on public.product_images (product_id, turn14_id)
where turn14_id is not null;
create unique index product_images_one_primary_per_product_idx
on public.product_images (product_id)
where is_primary;

create index sync_runs_source_sync_type_started_at_idx
on public.sync_runs (source, sync_type, started_at desc);
create index sync_runs_status_started_at_idx
on public.sync_runs (status, started_at desc);

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.brands to service_role;
grant select, insert, update, delete on table public.categories to service_role;
grant select, insert, update, delete on table public.mustang_generations to service_role;
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.product_categories to service_role;
grant select, insert, update, delete on table public.product_fitments to service_role;
grant select, insert, update, delete on table public.product_images to service_role;
grant select, insert, update, delete on table public.sync_runs to service_role;

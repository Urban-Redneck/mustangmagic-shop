-- MustangMagic.store catalog schema
-- Purpose: normalized storefront catalog sourced from Turn14.
-- Scope: products, brands, categories, Mustang fitment, and sync tracking.
-- Excludes: authentication, carts, checkout, payments, and orders.

begin;

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
  turn14_id text unique,
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint brands_name_not_blank check (length(btrim(name)) > 0),
  constraint brands_slug_not_blank check (length(btrim(slug)) > 0)
);

create table public.mustang_generations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  start_year integer not null,
  end_year integer,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mustang_generations_slug_not_blank check (length(btrim(slug)) > 0),
  constraint mustang_generations_name_not_blank check (length(btrim(name)) > 0),
  constraint mustang_generations_year_range check (
    start_year >= 1964
    and (end_year is null or end_year >= start_year)
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_not_blank check (length(btrim(name)) > 0),
  constraint categories_slug_not_blank check (length(btrim(slug)) > 0),
  constraint categories_not_own_parent check (parent_id is null or parent_id <> id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  turn14_id text not null unique,
  brand_id uuid references public.brands(id) on delete set null,
  part_number text not null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  primary_image_url text,
  price numeric(12, 2),
  map_price numeric(12, 2),
  msrp numeric(12, 2),
  inventory_status text not null default 'unknown',
  active boolean not null default true,
  discontinued boolean not null default false,
  raw_turn14_json jsonb,
  turn14_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_turn14_id_not_blank check (length(btrim(turn14_id)) > 0),
  constraint products_part_number_not_blank check (length(btrim(part_number)) > 0),
  constraint products_name_not_blank check (length(btrim(name)) > 0),
  constraint products_slug_not_blank check (length(btrim(slug)) > 0),
  constraint products_price_non_negative check (price is null or price >= 0),
  constraint products_map_price_non_negative check (map_price is null or map_price >= 0),
  constraint products_msrp_non_negative check (msrp is null or msrp >= 0),
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
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  primary key (product_id, category_id)
);

create table public.product_fitments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  generation_id uuid references public.mustang_generations(id) on delete set null,
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

  constraint sync_runs_source_not_blank check (length(btrim(source)) > 0),
  constraint sync_runs_sync_type_valid check (
    sync_type in (
      'products',
      'brands',
      'categories',
      'fitments',
      'pricing',
      'inventory',
      'full'
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

-- Search document for catalog search across common product fields.
alter table public.products
add column search_document tsvector generated always as (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(part_number, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

-- Updated-at triggers.
create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger mustang_generations_set_updated_at
before update on public.mustang_generations
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_fitments_set_updated_at
before update on public.product_fitments
for each row execute function public.set_updated_at();

-- Brand indexes.
create index brands_name_idx on public.brands (name);
create index brands_turn14_id_idx on public.brands (turn14_id) where turn14_id is not null;

-- Category indexes.
create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_sort_order_idx on public.categories (is_active, sort_order);

-- Mustang generation indexes.
create index mustang_generations_year_range_idx
on public.mustang_generations (start_year, end_year);

create index mustang_generations_sort_order_idx
on public.mustang_generations (sort_order);

-- Product indexes for listing, detail, search, and Turn14 upserts.
create index products_active_idx on public.products (active);
create index products_brand_id_idx on public.products (brand_id);
create index products_part_number_idx on public.products (part_number);
create index products_inventory_status_idx on public.products (inventory_status);
create index products_active_inventory_status_idx
on public.products (active, inventory_status);
create index products_price_idx on public.products (price);
create index products_turn14_updated_at_idx
on public.products (turn14_updated_at) where turn14_updated_at is not null;
create index products_search_document_idx
on public.products using gin (search_document);
create index products_raw_turn14_json_idx
on public.products using gin (raw_turn14_json);

-- Product/category join indexes.
create index product_categories_category_id_idx
on public.product_categories (category_id);

create unique index product_categories_one_primary_per_product_idx
on public.product_categories (product_id)
where is_primary;

-- Product fitment indexes for Mustang browsing and filters.
create index product_fitments_product_id_idx
on public.product_fitments (product_id);

create index product_fitments_generation_id_idx
on public.product_fitments (generation_id);

create index product_fitments_year_idx
on public.product_fitments (year);

create index product_fitments_engine_idx
on public.product_fitments (engine)
where engine is not null;

create index product_fitments_year_engine_idx
on public.product_fitments (year, engine)
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

-- Sync run indexes for operational visibility.
create index sync_runs_source_sync_type_started_at_idx
on public.sync_runs (source, sync_type, started_at desc);

create index sync_runs_status_started_at_idx
on public.sync_runs (status, started_at desc);

commit;

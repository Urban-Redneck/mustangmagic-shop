-- MustangMagic.store Supabase V1 catalog schema
-- Scope: raw Turn14 item ingestion, curated Mustang parts catalog, Turn14
-- supplier identifiers, fitment, product images, sync tracking, and
-- Stripe-backed order capture.
-- Excludes: auth, users, and cart persistence.

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

create table public.turn14_items_exp (
  id uuid primary key default gen_random_uuid(),
  turn14_id text not null,
  item_type text not null default 'Item',
  product_name text not null,
  part_number text not null,
  mfr_part_number text not null,
  part_description text not null,
  category text not null,
  subcategory text not null,
  brand_id integer not null,
  brand text not null,
  price_group_id integer not null,
  price_group text not null,
  active boolean not null,
  born_on_date date,
  regular_stock boolean not null,
  powersports_indicator boolean not null,
  dropship_controller_id integer not null,
  air_freight_prohibited boolean not null,
  not_carb_approved boolean not null,
  carb_acknowledgement_required boolean not null,
  carb_eo_number text,
  ltl_freight_required boolean not null,
  prop_65 text not null,
  epa text not null,
  units_per_sku integer not null,
  warehouse_availability jsonb not null default '[]'::jsonb,
  clearance_item boolean not null,
  thumbnail text,
  barcode text,
  alternate_part_number text,
  dimensions jsonb not null default '[]'::jsonb,
  contents jsonb not null default '[]'::jsonb,
  raw_json jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint turn14_items_exp_turn14_id_unique unique (turn14_id),
  constraint turn14_items_exp_turn14_id_not_blank check (length(btrim(turn14_id)) > 0),
  constraint turn14_items_exp_product_name_not_blank check (length(btrim(product_name)) > 0),
  constraint turn14_items_exp_part_number_not_blank check (length(btrim(part_number)) > 0),
  constraint turn14_items_exp_mfr_part_number_not_blank check (length(btrim(mfr_part_number)) > 0),
  constraint turn14_items_exp_category_not_blank check (length(btrim(category)) > 0),
  constraint turn14_items_exp_subcategory_not_blank check (length(btrim(subcategory)) > 0),
  constraint turn14_items_exp_brand_not_blank check (length(btrim(brand)) > 0),
  constraint turn14_items_exp_price_group_not_blank check (length(btrim(price_group)) > 0),
  constraint turn14_items_exp_units_per_sku_positive check (units_per_sku > 0),
  constraint turn14_items_exp_warehouse_availability_array check (jsonb_typeof(warehouse_availability) = 'array'),
  constraint turn14_items_exp_dimensions_array check (jsonb_typeof(dimensions) = 'array'),
  constraint turn14_items_exp_contents_array check (jsonb_typeof(contents) = 'array'),
  constraint turn14_items_exp_raw_json_object check (jsonb_typeof(raw_json) = 'object')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  turn14_id text not null,
  turn14_type text not null default 'Item',
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
  manual_price numeric(12, 2),
  manual_price_reason text,
  manual_price_updated_at timestamptz,
  map_price numeric(12, 2),
  msrp numeric(12, 2),
  price_group_id integer,
  price_group text,
  inventory_status text not null default 'unknown',
  inventory_quantity integer,
  inventory_updated_at timestamptz,
  inventory_eta jsonb,
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
  raw_turn14_inventory_json jsonb,
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
  constraint products_manual_price_non_negative check (manual_price is null or manual_price >= 0),
  constraint products_map_price_non_negative check (map_price is null or map_price >= 0),
  constraint products_msrp_non_negative check (msrp is null or msrp >= 0),
  constraint products_dimensions_array check (jsonb_typeof(dimensions) = 'array'),
  constraint products_warehouse_availability_array check (jsonb_typeof(warehouse_availability) = 'array'),
  constraint products_contents_array check (jsonb_typeof(contents) = 'array'),
  constraint products_raw_turn14_json_object check (raw_turn14_json is null or jsonb_typeof(raw_turn14_json) = 'object'),
  constraint products_inventory_quantity_non_negative check (inventory_quantity is null or inventory_quantity >= 0),
  constraint products_inventory_eta_object check (inventory_eta is null or jsonb_typeof(inventory_eta) = 'object'),
  constraint products_raw_turn14_inventory_json_object check (
    raw_turn14_inventory_json is null or jsonb_typeof(raw_turn14_inventory_json) = 'object'
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

create table public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'address_collected',
  cart_items jsonb not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  shipping_address jsonb not null,
  billing_address jsonb not null,
  billing_same_as_shipping boolean not null default true,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  turn14_quote_id text,
  turn14_order_id text,
  turn14_quote_payload jsonb,
  turn14_selected_shipping jsonb,
  turn14_order_payload jsonb,
  turn14_order_error text,
  turn14_order_submitted_at timestamptz,
  shipping_amount integer not null default 0,
  fee_amount integer not null default 0,
  acknowledge_prop_65 boolean not null default false,
  acknowledge_epa boolean not null default false,
  acknowledge_carb boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint checkout_intents_status_valid check (
    status in (
      'address_collected',
      'turn14_quoted',
      'stripe_session_created',
      'paid',
      'refunded',
      'turn14_order_submitted',
      'turn14_order_failed',
      'cancelled',
      'expired',
      'failed'
    )
  ),
  constraint checkout_intents_cart_items_array check (jsonb_typeof(cart_items) = 'array'),
  constraint checkout_intents_contact_name_not_blank check (length(btrim(contact_name)) > 0),
  constraint checkout_intents_contact_email_not_blank check (length(btrim(contact_email)) > 0),
  constraint checkout_intents_contact_phone_not_blank check (length(btrim(contact_phone)) > 0),
  constraint checkout_intents_shipping_address_object check (jsonb_typeof(shipping_address) = 'object'),
  constraint checkout_intents_billing_address_object check (jsonb_typeof(billing_address) = 'object'),
  constraint checkout_intents_turn14_quote_payload_object check (
    turn14_quote_payload is null or jsonb_typeof(turn14_quote_payload) = 'object'
  ),
  constraint checkout_intents_turn14_selected_shipping_array check (
    turn14_selected_shipping is null or jsonb_typeof(turn14_selected_shipping) = 'array'
  ),
  constraint checkout_intents_turn14_order_payload_object check (
    turn14_order_payload is null or jsonb_typeof(turn14_order_payload) = 'object'
  ),
  constraint checkout_intents_shipping_amount_non_negative check (shipping_amount >= 0),
  constraint checkout_intents_fee_amount_non_negative check (fee_amount >= 0),
  constraint checkout_intents_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint checkout_intents_stripe_session_unique unique (stripe_checkout_session_id)
);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  turn14_quote_id text,
  turn14_order_id text,
  status text not null default 'paid',
  payment_status text not null,
  fulfillment_status text not null default 'pending',
  amount_subtotal integer,
  amount_total integer not null,
  currency text not null default 'usd',
  customer_email text,
  customer_name text,
  customer_phone text,
  billing_address jsonb,
  shipping_address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  raw_stripe_session jsonb not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_orders_stripe_checkout_session_id_unique unique (stripe_checkout_session_id),
  constraint store_orders_stripe_checkout_session_id_not_blank check (length(btrim(stripe_checkout_session_id)) > 0),
  constraint store_orders_status_valid check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  constraint store_orders_payment_status_not_blank check (length(btrim(payment_status)) > 0),
  constraint store_orders_fulfillment_status_valid check (
    fulfillment_status in ('pending', 'reviewing', 'ready_to_order', 'ordered', 'partially_fulfilled', 'fulfilled', 'cancelled')
  ),
  constraint store_orders_amount_subtotal_non_negative check (amount_subtotal is null or amount_subtotal >= 0),
  constraint store_orders_amount_total_non_negative check (amount_total >= 0),
  constraint store_orders_currency_not_blank check (length(btrim(currency)) > 0),
  constraint store_orders_billing_address_object check (billing_address is null or jsonb_typeof(billing_address) = 'object'),
  constraint store_orders_shipping_address_object check (shipping_address is null or jsonb_typeof(shipping_address) = 'object'),
  constraint store_orders_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint store_orders_raw_stripe_session_object check (jsonb_typeof(raw_stripe_session) = 'object')
);

create table public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  turn14_id text,
  part_number text,
  product_name text not null,
  quantity integer not null,
  unit_amount integer not null,
  amount_total integer not null,
  currency text not null default 'usd',
  stripe_line_item_id text,
  stripe_product_id text,
  raw_stripe_line_item jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_order_items_quantity_positive check (quantity > 0),
  constraint store_order_items_unit_amount_non_negative check (unit_amount >= 0),
  constraint store_order_items_amount_total_non_negative check (amount_total >= 0),
  constraint store_order_items_product_name_not_blank check (length(btrim(product_name)) > 0),
  constraint store_order_items_currency_not_blank check (length(btrim(currency)) > 0),
  constraint store_order_items_raw_stripe_line_item_object check (jsonb_typeof(raw_stripe_line_item) = 'object')
);

create table public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  source text not null default 'checkout',
  consent_status text not null default 'subscribed',
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_order_id uuid references public.store_orders(id) on delete set null,
  stripe_customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_contacts_email_unique unique (email),
  constraint marketing_contacts_email_not_blank check (length(btrim(email)) > 0),
  constraint marketing_contacts_source_not_blank check (length(btrim(source)) > 0),
  constraint marketing_contacts_consent_status_valid check (
    consent_status in ('subscribed', 'unsubscribed')
  ),
  constraint marketing_contacts_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  api_version text,
  livemode boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_webhook_events_stripe_event_id_unique unique (stripe_event_id),
  constraint stripe_webhook_events_stripe_event_id_not_blank check (length(btrim(stripe_event_id)) > 0),
  constraint stripe_webhook_events_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint stripe_webhook_events_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.products
add column search_document tsvector generated always as (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(part_number, '') || ' ' ||
    coalesce(manufacturer_part_number, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger mustang_generations_set_updated_at
before update on public.mustang_generations
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger turn14_items_exp_set_updated_at
before update on public.turn14_items_exp
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

create trigger checkout_intents_set_updated_at
before update on public.checkout_intents
for each row execute function public.set_updated_at();

create trigger store_orders_set_updated_at
before update on public.store_orders
for each row execute function public.set_updated_at();

create trigger store_order_items_set_updated_at
before update on public.store_order_items
for each row execute function public.set_updated_at();

create trigger marketing_contacts_set_updated_at
before update on public.marketing_contacts
for each row execute function public.set_updated_at();

create trigger stripe_webhook_events_set_updated_at
before update on public.stripe_webhook_events
for each row execute function public.set_updated_at();

-- Slug and external identifier indexes.
create index brands_slug_idx on public.brands (slug);
create index brands_turn14_id_idx on public.brands (turn14_id) where turn14_id is not null;
create index categories_slug_idx on public.categories (slug);
create index mustang_generations_slug_idx on public.mustang_generations (slug);
create index turn14_items_exp_turn14_id_idx on public.turn14_items_exp (turn14_id);
create index products_slug_idx on public.products (slug);
create index products_turn14_id_idx on public.products (turn14_id);

-- Raw Turn14 export staging indexes.
create index turn14_items_exp_brand_id_idx on public.turn14_items_exp (brand_id);
create index turn14_items_exp_part_number_idx on public.turn14_items_exp (part_number);
create index turn14_items_exp_mfr_part_number_idx on public.turn14_items_exp (mfr_part_number);
create index turn14_items_exp_category_subcategory_idx
on public.turn14_items_exp (category, subcategory);
create index turn14_items_exp_active_idx on public.turn14_items_exp (active);
create index turn14_items_exp_processed_at_idx on public.turn14_items_exp (processed_at);
create index turn14_items_exp_raw_json_idx on public.turn14_items_exp using gin (raw_json);

-- Product listing and filtering indexes.
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
create index products_price_group_id_idx on public.products (price_group_id)
where price_group_id is not null;
create index products_active_idx on public.products (active);
create index products_storefront_visible_idx on public.products (storefront_visible);
create index products_active_storefront_visible_idx
on public.products (active, storefront_visible);
create index products_inventory_status_idx on public.products (inventory_status);
create index products_inventory_quantity_idx
on public.products (inventory_quantity)
where inventory_quantity is not null;
create index products_inventory_updated_at_idx
on public.products (inventory_updated_at)
where inventory_updated_at is not null;
create index products_price_idx on public.products (price);
create index products_manual_price_idx
on public.products (manual_price)
where manual_price is not null;
create index products_featured_idx on public.products (featured) where featured = true;
create index products_search_document_idx on public.products using gin (search_document);
create index products_raw_turn14_json_idx on public.products using gin (raw_turn14_json);
create index products_turn14_updated_at_idx
on public.products (turn14_updated_at)
where turn14_updated_at is not null;

create unique index products_brand_part_number_unique_idx
on public.products (brand_id, part_number)
where brand_id is not null;

-- Category lookup indexes.
create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_sort_order_idx
on public.categories (is_active, sort_order);
create index product_categories_product_id_idx
on public.product_categories (product_id);
create index product_categories_category_id_idx
on public.product_categories (category_id);
create unique index product_categories_one_primary_per_product_idx
on public.product_categories (product_id)
where is_primary;

-- Fitment lookup indexes.
create index mustang_generations_year_range_idx
on public.mustang_generations (start_year, end_year);
create index mustang_generations_sort_order_idx
on public.mustang_generations (sort_order);
create index product_fitments_product_id_idx
on public.product_fitments (product_id);
create index product_fitments_generation_id_idx
on public.product_fitments (generation_id);
create index product_fitments_year_idx
on public.product_fitments (year);
create index product_fitments_generation_year_idx
on public.product_fitments (generation_id, year);
create index product_fitments_engine_idx
on public.product_fitments (engine)
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

-- Product image indexes.
create index product_images_product_id_idx
on public.product_images (product_id);
create index product_images_turn14_id_idx
on public.product_images (turn14_id)
where turn14_id is not null;
create index product_images_product_sort_order_idx
on public.product_images (product_id, sort_order);
create unique index product_images_product_turn14_id_unique_idx
on public.product_images (product_id, turn14_id)
where turn14_id is not null;
create unique index product_images_one_primary_per_product_idx
on public.product_images (product_id)
where is_primary;

-- Sync monitoring indexes.
create index sync_runs_source_sync_type_started_at_idx
on public.sync_runs (source, sync_type, started_at desc);
create index sync_runs_status_started_at_idx
on public.sync_runs (status, started_at desc);

-- Checkout intent indexes.
create index checkout_intents_created_at_idx
on public.checkout_intents (created_at desc);
create index checkout_intents_status_idx
on public.checkout_intents (status);
create index checkout_intents_contact_email_idx
on public.checkout_intents (contact_email);
create index checkout_intents_payment_intent_idx
on public.checkout_intents (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;
create index checkout_intents_turn14_quote_id_idx
on public.checkout_intents (turn14_quote_id)
where turn14_quote_id is not null;
create index checkout_intents_turn14_order_id_idx
on public.checkout_intents (turn14_order_id)
where turn14_order_id is not null;

-- Order capture indexes.
create index store_orders_created_at_idx
on public.store_orders (created_at desc);
create index store_orders_payment_intent_idx
on public.store_orders (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;
create index store_orders_fulfillment_status_idx
on public.store_orders (fulfillment_status);
create index store_orders_customer_email_idx
on public.store_orders (customer_email)
where customer_email is not null;
create index store_orders_turn14_quote_id_idx
on public.store_orders (turn14_quote_id)
where turn14_quote_id is not null;
create index store_orders_turn14_order_id_idx
on public.store_orders (turn14_order_id)
where turn14_order_id is not null;
create index store_order_items_order_id_idx
on public.store_order_items (order_id);
create index store_order_items_product_id_idx
on public.store_order_items (product_id)
where product_id is not null;
create index store_order_items_turn14_id_idx
on public.store_order_items (turn14_id)
where turn14_id is not null;
create index store_order_items_part_number_idx
on public.store_order_items (part_number)
where part_number is not null;
create index marketing_contacts_consent_status_idx
on public.marketing_contacts (consent_status);
create index marketing_contacts_last_order_id_idx
on public.marketing_contacts (last_order_id)
where last_order_id is not null;
create index stripe_webhook_events_event_type_created_at_idx
on public.stripe_webhook_events (event_type, created_at desc);
create index stripe_webhook_events_processed_at_idx
on public.stripe_webhook_events (processed_at)
where processed_at is not null;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.brands to service_role;
grant select, insert, update, delete on table public.categories to service_role;
grant select, insert, update, delete on table public.mustang_generations to service_role;
grant select, insert, update, delete on table public.turn14_items_exp to service_role;
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.product_categories to service_role;
grant select, insert, update, delete on table public.product_fitments to service_role;
grant select, insert, update, delete on table public.product_images to service_role;
grant select, insert, update, delete on table public.sync_runs to service_role;
grant select, insert, update, delete on table public.checkout_intents to service_role;
grant select, insert, update, delete on table public.store_orders to service_role;
grant select, insert, update, delete on table public.store_order_items to service_role;
grant select, insert, update, delete on table public.marketing_contacts to service_role;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;

commit;

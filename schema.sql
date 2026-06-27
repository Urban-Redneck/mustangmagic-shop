-- ============================================================
-- Mustang Magic & American Speed — Supabase Relational Schema
-- Auto parts categorization, inventory, orders, and fitment
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------
-- 1. PART CATEGORIES: Multi-level taxonomy
--    top_level → category → subcategory
--    e.g. Powertrain → Engine → Cylinder Heads
-- -----------------------------------------------------------
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  parent_id   uuid references categories(id) on delete cascade,
  description text,
  icon        text,              -- emoji or class for display
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Ensure no circular references via trigger
create or replace function check_no_circular_ref()
returns trigger language plpgsql as $$
begin
  if new.parent_id = new.id then
    raise exception 'Circular reference detected';
  end if;
  return new;
end;
$$;
create trigger no_circular_ref before insert or update on categories
  for each row execute function check_no_circular_ref();

-- Index for fast tree traversal
create index idx_categories_parent on categories(parent_id);
create index idx_categories_slug on categories(slug);

-- Seed top-level categories (Mustang-relevant)
insert into categories (name, slug, description, sort_order) values
  ('Headers & Exhaust',     'headers-exhaust',     'Long tubes, H-pipes, X-pipes, cat-backs, mufflers, tips',       1),
  ('Superchargers',          'superchargers',        'Whipple, ESS, Roush — bolt-on and kit configurations',         2),
  ('Turbo Kits',             'turbo-kits',           'Complete turbo systems with manifolds, charge pipes, wastegates', 3),
  ('Intakes & Air Systems',  'intakes',              'Cold air intakes, ram air, throttle bodies',                     4),
  ('Fuel Systems',           'fuel-systems',         'Fuel pumps, injectors, rails, regulators, E85 flex fuel',        5),
  ('Suspension & Gears',     'suspension-gears',     'Control arms, springs, coilovers, differential, gear kits',      6),
  ('Engine Components',      'engine-components',    'Clutches, flywheels, bearings, gaskets, oil pumps',             7),
  ('Brake Upgrades',         'brake-upgrades',       'Big brake kits, calipers, rotors, pads',                        8),
  ('Electrical & Tuning',    'electrical-tuning',    'ECU tunes, programmers, wiring harnesses, gauges',              9),
  ('Interior & Exterior',    'interior-exterior',    'Convertibles tops, spoilers, wheels, seats, interior trim',     10),
  ('Wheels & Tires',         'wheels-tires',         'Aftermarket wheels and performance tires',                      11);

-- Seed subcategories
insert into categories (name, slug, parent_id, sort_order)
select 'Headers',       'headers',        c.id, 1 from categories c where c.slug = 'headers-exhaust'
union all select 'Cat-Back Systems', 'cat-back', c.id, 2 from categories c where c.slug = 'headers-exhaust'
union all select 'Exhaust Tips',     'exhaust-tips', c.id, 3 from categories c where c.slug = 'headers-exhaust'
union all select 'Complete Kits',    'complete-kits', c.id, 4 from categories c where c.slug = 'headers-exhaust'
union all select 'Supercharger Kits',   'sc-kits', c.id, 1 from categories c where c.slug = 'superchargers'
union all select 'Blowers Only',        'blowers-only', c.id, 2 from categories c where c.slug = 'superchargers'
union all select 'SC Accessories',      'sc-accessories', c.id, 3 from categories c where c.slug = 'superchargers'
union all select 'T45 Turbo Kits',   't45-kits', c.id, 1 from categories c where c.slug = 'turbo-kits'
union all select 'Twin Turbo',       'twin-turbo', c.id, 2 from categories c where c.slug = 'turbo-kits'
union all select 'Turbo Accessories', 'turbo-accessories', c.id, 3 from categories c where c.slug = 'turbo-kits'
union all select 'Cold Air Intakes', 'cold-air-intakes', c.id, 1 from categories c where c.slug = 'intakes'
union all select 'Throttle Bodies',  'throttle-bodies', c.id, 2 from categories c where c.slug = 'intakes'
union all select 'Fuel Pumps',       'fuel-pumps', c.id, 1 from categories c where c.slug = 'fuel-systems'
union all select 'Injectors',        'injectors', c.id, 2 from categories c where c.slug = 'fuel-systems'
union all select 'Fuel Rails & Regulators', 'fuel-rails', c.id, 3 from categories c where c.slug = 'fuel-systems'
union all select 'Control Arms',     'control-arms', c.id, 1 from categories c where c.slug = 'suspension-gears'
union all select 'Springs & Coilovers', 'springs-coilovers', c.id, 2 from categories c where c.slug = 'suspension-gears'
union all select 'Differential Parts', 'diff-parts', c.id, 3 from categories c where c.slug = 'suspension-gears'
union all select 'Gear Conversion Kits', 'gear-kits', c.id, 4 from categories c where c.slug = 'suspension-gears'
union all select 'Clutches & Flywheels', 'clutch-flywheel', c.id, 1 from categories c where c.slug = 'engine-components'
union all select 'Bearings & Gaskets',   'bearings-gaskets', c.id, 2 from categories c where c.slug = 'engine-components'
union all select 'BBK Kits',        'bbk-kits', c.id, 1 from categories c where c.slug = 'brake-upgrades'
union all select 'Calipers & Rotors',   'calipers-rotors', c.id, 2 from categories c where c.slug = 'brake-upgrades'
union all select 'ECU Tuning',      'ecu-tuning', c.id, 1 from categories c where c.slug = 'electrical-tuning'
union all select 'Programmables',   'programmables', c.id, 2 from categories c where c.slug = 'electrical-tuning'
union all select 'Convertible Tops', 'convertible-tops', c.id, 1 from categories c where c.slug = 'interior-exterior'
union all select 'Wheels',          'wheels-sub', c.id, 2 from categories c where c.slug = 'interior-exterior';


-- -----------------------------------------------------------
-- 2. BRANDS / MANUFACTURERS
-- -----------------------------------------------------------
create table brands (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  logo_url    text,
  website     text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);
create index idx_brands_slug on brands(slug);

-- Seed common Mustang aftermarket brands
insert into brands (name, slug) values
  ('Whipple', 'whipple'), ('ESS', 'ess'), ('Tomei', 'tomei'), ('Kooks', 'kooks'),
  ('Aeromotive', 'aeromotive'), ('BMR', 'bmr'), ('Eibach', 'eibach'), ('Brembo', 'brembo'),
  ('Stainless Works', 'stainless-works'), ('MTM Performance', 'mtm-performance'),
  ('Roush', 'roush'), ('Palmer Performance', 'palmer-performance'),
  ('BBK', 'bbk'), ('Stealth Motorsports', 'stealth-motorsports'),
  ('Ford Performance', 'ford-performance'), ('FRPP', 'frpp'),
  ('Lunaz', 'lunaz'), ('SVE', 'sve'), ('Coyote Swap Central', 'coyote-swap-central');


-- -----------------------------------------------------------
-- 3. PRODUCTS (relational to categories, brands)
--    Source of truth — Turn 14 sync can upsert here
-- -----------------------------------------------------------
create table products (
  id              uuid primary key default uuid_generate_v4(),
  sku             text not null unique,
  name            text not null,
  short_description text,
  long_description text,
  category_id     uuid references categories(id),
  subcategory_id  uuid references categories(id),
  brand_id        uuid references brands(id),
  price           numeric(10,2) not null,
  map_price       numeric(10,2),
  list_price      numeric(10,2),
  purchase_cost   numeric(10,2),
  turn14_item_id  text unique,       -- mirror Turn 14 ID for sync
  active          boolean default true,
  images          jsonb default '[]'::jsonb,  -- [{url, alt, primary: bool}]
  spec_sheet_url  text,              -- PDF specs / installation guide
  weight_lbs      numeric(5,2),
  freight_class   int,               -- UPS/LTL freight class
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_products_category on products(subcategory_id);
create index idx_products_brand on products(brand_id);
create index idx_products_sku on products(sku);
create index idx_products_active on products(active) where active = true;
create index idx_products_price on products(price);

-- RLS: public can read, only authenticated (admin) can write
alter table products enable row level security;
create policy "Products are publicly readable" on products for select using (true);
create policy "Only admins can insert" on products for insert with check (auth.uid() = (select admin_id from settings where key = 'master_admin'));
create policy "Only admins can update" on products for update using (auth.uid() = (select admin_id from settings));


-- -----------------------------------------------------------
-- 4. YMM FITMENT: Year/Make/Vehicle fitment matrix
--    Associates a product with specific Mustang years/generations
-- -----------------------------------------------------------
create table vehicle_generations (
  id          uuid primary key default uuid_generate_v4(),
  year        smallint not null,
  make        text not null default 'Ford',
  model       text not null,           -- e.g. 'Mustang'
  generation  text not null,           -- e.g. 'S550', 'Foxbody'
  body_style  text,                    -- e.g. 'Coupe', 'Convertible', 'GT', 'Shelby GT350'
  engine      text,                    -- e.g. '5.0L Coyote V8', '2.3L EcoBoost'
  created_at  timestamptz default now(),
  unique(year, model, generation, body_style)
);

create table product_fitments (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid references products(id) on delete cascade,
  vehicle_id  uuid references vehicle_generations(id) on delete cascade,
  notes       text,                    -- "Fits both V6 and GT" etc.
  created_at  timestamptz default now(),
  unique(product_id, vehicle_id)
);

-- Seed Mustang generations
insert into vehicle_generations (year, model, generation, body_style, engine) values
  (1979, 'Ford', 'Foxbody',    'Coupe',        '5.0L V8'),
  (1982, 'Ford', 'Foxbody',    'Convertible',  '5.0L V8'),
  (1987, 'Ford', 'Foxbody',    'GT Coupe',     '5.0L V8'),
  (1989, 'Ford', 'Foxbody',    'Cobra',        '5.0L V8'),
  (1994, 'Ford', 'SN95',      'Coupe',         '4.6L V8'),
  (1999, 'Ford', 'SN95',      'Mach 1',        '5.4L V8'),
  (2001, 'Ford', 'SN95',      'SVT Cobra',     '5.4L V8'),
  (2005, 'Ford', 'S197',      'Coupe',         '4.6L V8'),
  (2007, 'Ford', 'S197',      'Mach 1',        '4.6L V8'),
  (2011, 'Ford', 'S197',      'V6 Coupe',      '3.7L V6'),
  (2013, 'Ford', 'S197',      'GT Coupe',      '5.0L Coyote V8'),
  (2015, 'Ford', 'S550',      'Coupe',         '3.7L V6'),
  (2015, 'Ford', 'S550',      'Mustang GT',    '5.0L Coyote V8'),
  (2015, 'Ford', 'S550',      'EcoBoost Premium','2.3L Turbo I4'),
  (2020, 'Ford', 'S550',      'Mach 1',        '5.0L Coyote V8'),
  (2020, 'Ford', 'S550',      'Shelby GT500',  '5.2L SVT Predator'),
  (2024, 'Ford', 'S650',      'Mustang GT',    '5.0L Coyote V8'),
  (2024, 'Ford', 'S650',      'Dark Horse',    '5.0L Coyote V8');

-- -----------------------------------------------------------
-- 5. ORDERS: Full relational order management
-- -----------------------------------------------------------
create table orders (
  id              uuid primary key default uuid_generate_v4(),
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  status          text not null default 'pending',   -- pending | paid | processing | shipped | delivered | cancelled
  stripe_session_id text unique,
  subtotal        numeric(10,2) not null default 0,
  shipping        numeric(5,2) default 0,
  tax             numeric(8,2) default 0,
  total           numeric(10,2) not null default 0,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id),
  sku         text not null,           -- snapshot at time of purchase
  product_name text not null,           -- snapshot at time of purchase
  quantity    int not null default 1,
  unit_price  numeric(10,2) not null,   -- price at time of purchase
  total_price numeric(10,2) not null,
  created_at  timestamptz default now()
);

create table order_addresses (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete cascade,
  address_type text not null check (address_type in ('shipping', 'billing')),
  first_name  text,
  last_name   text,
  company     text,
  address1    text not null,
  address2    text,
  city        text not null,
  state       text not null,
  zip         text not null,
  country     text default 'US',
  phone       text
);

-- -----------------------------------------------------------
-- 6. CART SESSIONS (replaces/indep of Redis)
--    Persistent cart stored in DB for cross-device support
-- -----------------------------------------------------------
create table cart_sessions (
  id              uuid primary key default uuid_generate_v4(),
  session_token   text not null unique,
  customer_email  text,                    -- if logged-in / email captured
  status          text default 'active',   -- active | converted | expired
  total_items     int default 0,
  expires_at      timestamptz,             -- TTL for abandoned cart cleanup
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_cart_sessions_token on cart_sessions(session_token);
create index idx_cart_sessions_expires on cart_sessions(expires_at) where status = 'active';

create table cart_items (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid references cart_sessions(id) on delete cascade,
  product_id      uuid references products(id),
  quantity        int not null default 1 check (quantity > 0),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(session_id, product_id)
);

create index idx_cart_items_session on cart_items(session_id);


-- -----------------------------------------------------------
-- 7. REVIEWS / RATINGS (customer feedback for products)
-- -----------------------------------------------------------
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid references products(id) on delete cascade,
  customer_name text not null,
  customer_email text,            -- for verification only, not displayed
  rating      smallint check (rating >= 1 and rating <= 5),
  title       text,
  body        text,
  verified_purchase boolean default false,
  is_approved boolean default false,
  created_at  timestamptz default now()
);

create index idx_reviews_product on reviews(product_id);


-- -----------------------------------------------------------
-- 8. SETTINGS (singleton table for shop config)
-- -----------------------------------------------------------
create table settings (
  key   text primary key,
  value jsonb not null,
  description text
);

-- Initial shop settings
insert into settings (key, value, description) values
  ('shop_name', '"Mustang Magic & American Speed"', 'Shop display name'),
  ('currency', '"USD"', 'Default currency code'),
  ('free_shipping_threshold', '99.00', 'Orders above this get free shipping'),
  ('ny_sales_tax_rate', '8.0', 'NY state sales tax percentage'),
  ('mustangmagic_store_url', '"https://mustangmagic.store"', 'Live domain URL'),
  ('turn14_client_id_env', '"TURN14_CLIENT_ID"', 'Env var name for Turn 14 client ID'),
  ('stripe_secret_key_env', '"STRIPE_SECRET_KEY"', 'Env var name for Stripe secret key'),
  ('supabase_url_env', '"NEXT_PUBLIC_SUPABASE_URL"', 'Env var name for Supabase URL');


-- -----------------------------------------------------------
-- 9. INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);
create index idx_order_items_order on order_items(order_id);


-- ============================================================
-- NOTES:
-- - Run this SQL in Supabase SQL Editor or via `psql`
-- - Turn 14 sync should upsert into products table (not replace)
-- - Fitment data from Turn 14 API /v1/items/fitment/{id} maps to product_fitments
-- - Cart Redis fallback: cart_sessions table is the source of truth; Redis for locking only
-- ============================================================

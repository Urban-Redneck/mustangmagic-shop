# MustangMagic.store Project Plan

## Goal

Build MustangMagic.store as a Mustang-focused ecommerce catalog using Next.js, Supabase, and Turn14.

The simplest durable architecture is:

1. Turn14 is the upstream product data source.
2. Supabase stores the normalized, searchable storefront catalog.
3. Next.js renders category, fitment, listing, and product pages from Supabase.
4. Checkout later validates product price and availability server-side before payment.

Do not call Turn14 directly from public product listing pages. Use a sync process to keep Supabase current so storefront pages stay fast, cacheable, and resilient to Turn14 API latency or rate limits.

## Current Project State

The project is a clean Next.js App Router starter with:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- `@supabase/supabase-js`
- No application-specific routes, database layer, auth, checkout, or product UI yet

The app can be built incrementally without replacing the starter structure.

## Architecture Overview

```txt
Turn14 API
  |
  | scheduled/admin sync
  v
Supabase Postgres
  |
  | server-side queries
  v
Next.js App Router
  |
  | catalog pages, product pages, cart, checkout
  v
Customer
```

### Responsibilities

Next.js:

- Render public storefront pages
- Handle route structure and SEO metadata
- Read catalog data from Supabase on the server
- Host protected route handlers for cron sync and checkout
- Keep Turn14 and payment secrets server-only

Supabase:

- Store normalized products, brands, categories, fitments, images, prices, and inventory snapshots
- Provide indexed filtering and search
- Store carts/orders later if needed
- Track sync runs and upstream data state

Turn14:

- Provide product, brand, fitment, image, pricing, and inventory source data
- Be queried by scheduled sync jobs
- Be rechecked during checkout before payment/order submission

Stripe or payment provider:

- Handle payment collection later
- Send webhook events back to Next.js
- Never trust client-submitted prices

## Phased Roadmap

## Phase 1: Foundation

Objective: establish catalog data model, environment boundaries, and project organization.

Deliverables:

- Supabase project created
- Local environment variables documented
- Server-only Supabase admin client
- Public/server Supabase read client
- Database schema migration files
- Seed data for Mustang generations and storefront categories
- Initial app metadata changed from starter values

Recommended environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TURN14_CLIENT_ID=
TURN14_CLIENT_SECRET=
TURN14_API_BASE_URL=

CRON_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Only `NEXT_PUBLIC_*` values may be exposed to browser code.

## Phase 2: Catalog Sync

Objective: import Turn14 data into Supabase and keep it fresh.

Deliverables:

- Turn14 API client
- Product sync route handler protected by `CRON_SECRET`
- Sync run logging
- Upsert logic for products, brands, images, categories, and fitments
- Basic error handling and retry-safe writes
- Manual sync command or admin-only endpoint for development

Initial sync behavior:

- Fetch products from Turn14 in pages/batches.
- Normalize each product into storefront tables.
- Preserve upstream payload in `products.raw_turn14_json` for debugging and future fields.
- Mark missing or discontinued products inactive instead of deleting them.
- Store pricing and inventory snapshots separately enough to update them frequently.

Preferred sync cadence:

- Product metadata: daily
- Pricing: multiple times per day if allowed
- Inventory: hourly or more often if allowed
- Checkout validation: real-time or nearest available Turn14 check

## Phase 3: Storefront Catalog

Objective: build public browsing and product discovery.

Deliverables:

- Homepage with featured Mustang generations and categories
- `/parts` product listing page
- `/mustang/[generation]` generation landing page
- `/mustang/[generation]/[category]` filtered listing page
- `/products/[slug]` product detail page
- Shared product card, category nav, filter controls, and pagination
- SEO metadata for product/category pages
- Loading and not-found states

Filtering priorities:

- Mustang generation
- Year
- Engine
- Category
- Brand
- Price range
- Availability
- Search term

Keep product listing queries server-side at first. Use Client Components only for interactive UI controls such as sort menus, filter drawers, quantity selectors, and cart buttons.

## Phase 4: Cart

Objective: allow shoppers to collect products before checkout.

Deliverables:

- Add-to-cart interaction
- Cart page at `/cart`
- Quantity updates
- Remove item
- Cart summary
- Server-side cart validation endpoint

Simplest first cart:

- Store cart state in browser local storage.
- Product IDs and quantities are client-side.
- Prices shown in the cart are display estimates.
- Validate all product IDs, prices, inventory, and purchasability server-side before checkout.

Later cart option:

- Persist carts in Supabase for logged-in users, abandoned cart recovery, or multi-device behavior.

## Phase 5: Checkout

Objective: accept payment safely after server-side validation.

Deliverables:

- Checkout creation route handler
- Server-side cart validation
- Stripe Checkout Session creation
- Stripe webhook handler
- Order and order item tables
- Payment status tracking
- Order confirmation page

Checkout rules:

- Never trust client-submitted prices.
- Re-read product data from Supabase.
- Recheck current price and inventory from Turn14 when possible.
- Reject inactive, unavailable, or price-changed products before payment.
- Store a full order item snapshot so future product changes do not alter historical orders.

## Phase 6: Fulfillment and Operations

Objective: support real store operations after payments work.

Deliverables:

- Admin-only order view
- Order status lifecycle
- Fulfillment status
- Turn14 order submission integration if available and approved
- Customer email notifications
- Refund/cancellation handling
- Basic analytics events

## Recommended Folder Structure

```txt
src/
  app/
    layout.tsx
    page.tsx

    parts/
      page.tsx
      loading.tsx

    mustang/
      [generation]/
        page.tsx
        [category]/
          page.tsx
          loading.tsx

    products/
      [slug]/
        page.tsx
        loading.tsx
        not-found.tsx

    cart/
      page.tsx

    checkout/
      page.tsx
      success/
        page.tsx
      cancel/
        page.tsx

    api/
      cron/
        sync-turn14/
          route.ts
      checkout/
        route.ts
      webhooks/
        stripe/
          route.ts

  components/
    layout/
      header.tsx
      footer.tsx
      main-nav.tsx
    product/
      product-card.tsx
      product-grid.tsx
      product-gallery.tsx
      product-price.tsx
    category/
      category-nav.tsx
      generation-nav.tsx
    filters/
      product-filters.tsx
      sort-menu.tsx
    cart/
      add-to-cart-button.tsx
      cart-line-item.tsx
      cart-summary.tsx
    ui/
      button.tsx
      input.tsx
      select.tsx
      badge.tsx

  lib/
    supabase/
      server.ts
      admin.ts
      types.ts
    turn14/
      client.ts
      types.ts
      normalize.ts
      sync-products.ts
      sync-pricing.ts
      sync-inventory.ts
    catalog/
      queries.ts
      filters.ts
      slugs.ts
    checkout/
      validate-cart.ts
      stripe.ts
    env.ts

  types/
    catalog.ts
    checkout.ts

supabase/
  migrations/
  seed.sql
```

Notes:

- Keep route files thin.
- Put reusable data access in `src/lib/catalog/queries.ts`.
- Put Turn14 code behind server-only modules.
- Keep client components small and interaction-focused.

## Supabase Schema

The schema should favor normalized storefront reads while preserving upstream Turn14 data for debugging and future enrichment.

### `brands`

```sql
create table brands (
  id uuid primary key default gen_random_uuid(),
  turn14_id text unique,
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `products`

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  turn14_id text not null unique,
  brand_id uuid references brands(id),
  part_number text not null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  primary_image_url text,
  price numeric(12,2),
  map_price numeric(12,2),
  msrp numeric(12,2),
  inventory_status text not null default 'unknown',
  active boolean not null default true,
  raw_turn14_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended `inventory_status` values:

```txt
unknown
in_stock
low_stock
out_of_stock
discontinued
special_order
```

### `product_images`

```sql
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

### `categories`

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `product_categories`

```sql
create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
```

### `mustang_generations`

```sql
create table mustang_generations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  start_year integer not null,
  end_year integer,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Suggested seed data:

```txt
fox-body      1979-1993
sn95          1994-1998
new-edge      1999-2004
s197          2005-2014
s550          2015-2023
s650          2024-present
```

### `product_fitments`

```sql
create table product_fitments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  generation_id uuid references mustang_generations(id),
  year integer not null,
  make text not null default 'Ford',
  model text not null default 'Mustang',
  trim text,
  engine text,
  notes text,
  created_at timestamptz not null default now()
);
```

### `product_prices`

Use this table if pricing needs history or frequent independent updates.

```sql
create table product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  price numeric(12,2),
  map_price numeric(12,2),
  msrp numeric(12,2),
  currency text not null default 'USD',
  source text not null default 'turn14',
  fetched_at timestamptz not null default now()
);
```

For the first version, storing current price directly on `products` is acceptable. Add `product_prices` when history or auditing matters.

### `product_inventory`

```sql
create table product_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  status text not null default 'unknown',
  quantity integer,
  source text not null default 'turn14',
  fetched_at timestamptz not null default now()
);
```

For the first version, storing current status directly on `products` is acceptable. Add this table when warehouse-level inventory or history matters.

### `sync_runs`

```sql
create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  sync_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_seen integer not null default 0,
  records_upserted integer not null default 0,
  records_failed integer not null default 0,
  error text,
  metadata jsonb
);
```

Recommended `sync_type` values:

```txt
products
pricing
inventory
images
fitments
full
```

Recommended `status` values:

```txt
running
succeeded
failed
partial
```

### Checkout Tables

Add these when checkout work begins.

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  customer_email text,
  status text not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  turn14_id text,
  brand_name text,
  part_number text,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null,
  product_snapshot jsonb,
  created_at timestamptz not null default now()
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
```

## Indexes

Start with these indexes:

```sql
create index products_active_idx on products(active);
create index products_brand_id_idx on products(brand_id);
create index products_part_number_idx on products(part_number);
create index products_inventory_status_idx on products(inventory_status);

create index product_categories_category_id_idx on product_categories(category_id);
create index product_fitments_product_id_idx on product_fitments(product_id);
create index product_fitments_generation_id_idx on product_fitments(generation_id);
create index product_fitments_year_idx on product_fitments(year);
create index product_fitments_engine_idx on product_fitments(engine);

create index product_images_product_id_idx on product_images(product_id);
create index sync_runs_source_sync_type_idx on sync_runs(source, sync_type);
```

For search:

```sql
alter table products
add column search_document tsvector generated always as (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(part_number, '') || ' ' ||
    coalesce(short_description, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

create index products_search_document_idx
on products using gin(search_document);
```

## Row Level Security

Enable RLS before production.

Initial policy approach:

- Public catalog tables may allow read access to active products only.
- Admin/service-role writes should be limited to sync jobs and internal server code.
- Orders should not be publicly readable.
- Webhook events should only be written/read by service-role server code.

Simplest implementation:

- Use server-side Supabase queries for storefront pages.
- Use Supabase service role only in server-only modules.
- Avoid browser-side writes until auth and RLS policies are intentionally designed.

## Turn14 Sync Plan

### Sync Inputs

The sync should collect as available from Turn14:

- Product identifiers
- Brand/manufacturer
- Part number
- Product name
- Product descriptions
- Product categories
- Vehicle fitment data
- Images
- Pricing
- MAP/MSRP
- Inventory/availability
- Discontinued or inactive state

### Normalization Rules

Each Turn14 product should map to:

- `brands`
- `products`
- `product_images`
- `product_fitments`
- `product_categories`

Keep Turn14 IDs as stable upstream keys. Do not use part numbers alone as primary identifiers because part numbers can collide across brands.

Slug generation:

```txt
brand-name-part-number-product-name
```

If a slug collision occurs, append a short Turn14 ID suffix.

### Category Mapping

Use curated MustangMagic storefront categories instead of exposing raw supplier categories directly.

Suggested top-level categories:

```txt
Air & Fuel
Brakes
Cooling
Drivetrain
Engine
Exhaust
Exterior
Forced Induction
Interior
Lighting
Suspension
Tuning
Wheels & Tires
```

Maintain a mapping layer from Turn14 category names/IDs to these storefront categories.

Possible future table:

```sql
create table category_mappings (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'turn14',
  source_category_id text,
  source_category_name text,
  category_id uuid not null references categories(id),
  created_at timestamptz not null default now()
);
```

### Fitment Mapping

Map years to Mustang generations:

```txt
1979-1993 -> fox-body
1994-1998 -> sn95
1999-2004 -> new-edge
2005-2014 -> s197
2015-2023 -> s550
2024+     -> s650
```

Fitment records should remain year-specific so shoppers can filter by exact year later.

### Sync Route Handler

Recommended route:

```txt
src/app/api/cron/sync-turn14/route.ts
```

Expected behavior:

- Accept only `POST`.
- Require `Authorization: Bearer ${CRON_SECRET}`.
- Accept optional sync type in body, such as `products`, `pricing`, or `inventory`.
- Create a `sync_runs` row at start.
- Batch through Turn14 API pages.
- Upsert normalized records.
- Update `sync_runs` with counts and final status.
- Return concise JSON summary.

### Failure Handling

The sync should be retry-safe:

- Use upstream IDs and unique constraints for upserts.
- Log failed records without aborting the entire run when possible.
- Mark sync as `partial` if some records fail.
- Store enough error context in `sync_runs.metadata` to debug.
- Do not delete products automatically during a failed sync.

### Revalidation

After successful syncs, invalidate cached catalog pages if caching is enabled.

Useful cache tags later:

```txt
products
product:{slug}
category:{slug}
generation:{slug}
```

## Storefront Data Access

Recommended query functions:

```txt
getFeaturedCategories()
getMustangGenerations()
getProducts(filters)
getProductBySlug(slug)
getCategoryBySlug(slug)
getGenerationBySlug(slug)
getRelatedProducts(productId)
```

Product listing response shape:

```ts
type ProductListItem = {
  id: string;
  slug: string;
  brandName: string;
  partNumber: string;
  name: string;
  primaryImageUrl: string | null;
  price: number | null;
  inventoryStatus: string;
};
```

Product detail response shape:

```ts
type ProductDetail = ProductListItem & {
  description: string | null;
  images: Array<{
    url: string;
    alt: string | null;
  }>;
  categories: Array<{
    slug: string;
    name: string;
  }>;
  fitments: Array<{
    year: number;
    generationSlug: string | null;
    engine: string | null;
    trim: string | null;
    notes: string | null;
  }>;
};
```

## Checkout Roadmap

### Checkout Milestone 1: Cart Validation

Build a server-side validator that accepts:

```ts
type CartInput = Array<{
  productId: string;
  quantity: number;
}>;
```

It returns:

```ts
type ValidatedCart = {
  valid: boolean;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    inventoryStatus: string;
  }>;
  errors: string[];
  subtotal: number;
};
```

Validation rules:

- Product exists.
- Product is active.
- Quantity is positive and within allowed limits.
- Product is not discontinued.
- Current price is available.
- Inventory status allows purchase.

### Checkout Milestone 2: Stripe Checkout

Add:

```txt
src/lib/checkout/stripe.ts
src/lib/checkout/validate-cart.ts
src/app/api/checkout/route.ts
src/app/api/webhooks/stripe/route.ts
```

Checkout creation:

- Validate cart.
- Create Stripe Checkout Session.
- Store pending order or session metadata.
- Redirect customer to Stripe-hosted checkout.

Webhook handling:

- Verify Stripe signature.
- Deduplicate events with `webhook_events`.
- Create or update order records.
- Store order item snapshots.
- Mark order paid only from trusted webhook events.

### Checkout Milestone 3: Fulfillment

After payment:

- Confirm Turn14 order submission requirements.
- Submit order to Turn14 or create internal fulfillment task.
- Store fulfillment status.
- Email customer order confirmation.
- Add admin order view.

## Testing Plan

Phase 1-2:

- Unit test slug generation.
- Unit test category mapping.
- Unit test generation mapping from fitment year.
- Test Turn14 normalization with sample payloads.
- Test sync upserts are idempotent.

Phase 3:

- Test product listing query filters.
- Test product detail lookup by slug.
- Test not-found behavior for inactive/missing products.
- Run lint/build before deploy.

Phase 4-5:

- Test cart validation with inactive products, missing prices, and unavailable inventory.
- Test Stripe webhook signature verification.
- Test duplicate webhook events.
- Test order item snapshots.

## Deployment Plan

Recommended first production setup:

- Vercel for Next.js
- Supabase hosted Postgres
- Vercel Cron for sync route
- Stripe hosted Checkout

Deployment checklist:

- Set all environment variables in Vercel.
- Enable Supabase RLS.
- Verify service role key is never exposed to client code.
- Protect cron route with `CRON_SECRET`.
- Configure image domains in Next.js if using remote Turn14 image URLs.
- Configure Stripe webhook endpoint.
- Run production sync in a limited batch first.
- Confirm product listing performance with realistic catalog size.

## Open Decisions

- Confirm exact Turn14 API endpoints, pagination, auth flow, and rate limits.
- Decide whether product images should be hotlinked, proxied, or copied into Supabase Storage.
- Decide whether inventory should be shown as exact quantity or simple availability.
- Decide whether checkout should support tax/shipping calculation in phase one.
- Decide if user accounts are needed before or after checkout.
- Decide if an admin dashboard belongs inside this app or should be a separate tool.

## Implementation Principles

- Keep Turn14 secrets server-only.
- Keep routes thin and data access centralized.
- Prefer Supabase as the storefront read model.
- Preserve raw Turn14 payloads while normalizing key fields.
- Start with simple local cart state, then persist carts only when needed.
- Validate price and availability at checkout every time.
- Add abstractions only when repeated implementation pressure appears.

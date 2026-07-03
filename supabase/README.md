# Supabase Schema

This directory contains the PostgreSQL schema for the MustangMagic.store catalog.

The schema is intentionally limited to storefront catalog and Turn14 sync tracking. It does not include authentication, carts, checkout, payments, orders, or admin users yet.

## Files

- `schema.sql` - complete catalog schema for Supabase Postgres

## Architecture

Turn14 is the upstream product data source. Supabase is the normalized storefront read model used by the Next.js app.

```txt
Turn14 API
  -> scheduled sync
  -> Supabase catalog tables
  -> Next.js storefront pages
```

Public product pages should query Supabase, not Turn14 directly. Turn14 API calls should stay in server-only sync and validation code.

## Tables

### `brands`

Stores product brands/manufacturers.

Important fields:

- `id` - internal UUID primary key
- `turn14_id` - optional Turn14 brand identifier
- `name`
- `slug`
- `logo_url`

### `mustang_generations`

Stores curated Mustang generation navigation.

Suggested seed values:

```txt
fox-body   1979-1993
sn95       1994-1998
new-edge   1999-2004
s197       2005-2014
s550       2015-2023
s650       2024-present
```

### `categories`

Stores curated MustangMagic storefront categories. These should be shopper-facing categories, not raw Turn14 categories.

Recommended top-level categories:

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

The `parent_id` column supports nested categories.

### `products`

Stores normalized product data sourced from Turn14.

Important fields:

- `id` - internal UUID primary key
- `turn14_id` - required external product identifier from Turn14
- `brand_id` - foreign key to `brands`
- `part_number`
- `name`
- `slug`
- `price`, `map_price`, `msrp`
- `inventory_status`
- `active`
- `discontinued`
- `raw_turn14_json` - preserved upstream payload for debugging and future enrichment
- `turn14_updated_at` - upstream modified timestamp when available
- `search_document` - generated full-text search vector

Current allowed `inventory_status` values:

```txt
unknown
in_stock
low_stock
out_of_stock
discontinued
special_order
```

### `product_categories`

Many-to-many join table between products and categories.

Use `is_primary = true` for the main storefront category shown in breadcrumbs and product cards. A unique partial index enforces at most one primary category per product.

### `product_fitments`

Stores year-specific Mustang fitment records.

Important fields:

- `product_id`
- `generation_id`
- `year`
- `make`
- `model`
- `trim`
- `engine`
- `source`
- `source_fitment_id`

Fitments stay year-specific even when they also map to a Mustang generation. This keeps future year/engine filtering accurate.

### `sync_runs`

Tracks operational sync history from Turn14.

Recommended `sync_type` values:

```txt
products
brands
categories
fitments
pricing
inventory
full
```

Recommended `status` values:

```txt
running
succeeded
failed
partial
```

## Applying the Schema

For a new Supabase project, run the SQL in `schema.sql` in the Supabase SQL editor.

With the Supabase CLI, this file can also be adapted into a migration:

```bash
supabase migration new initial_catalog_schema
```

Then copy the contents of `schema.sql` into the generated migration file and apply it with:

```bash
supabase db push
```

## Indexing Strategy

The schema includes indexes for:

- Product detail lookup by `slug`
- Turn14 upserts by `turn14_id`
- Product listing filters by active status, brand, inventory, and price
- Product search with a generated `tsvector`
- Category browsing through `product_categories`
- Mustang generation/year/engine fitment filters
- Sync run monitoring by source, sync type, status, and start time

## Sync Notes

Turn14 sync code should:

- Upsert `brands` by `turn14_id` when available, otherwise by slug/name.
- Upsert `products` by `turn14_id`.
- Store the complete upstream payload in `products.raw_turn14_json`.
- Mark products inactive or discontinued instead of deleting them.
- Map Turn14 categories into curated `categories`.
- Insert or upsert year-specific `product_fitments`.
- Record each run in `sync_runs`.

Sync jobs should be retry-safe. Unique constraints and indexes are designed to make repeated syncs idempotent.

## Row Level Security

This schema does not enable Row Level Security policies yet.

Before production, decide whether the storefront will:

- Query Supabase only from server-side Next.js code, or
- Allow browser-side reads with the Supabase anon key.

If browser-side reads are enabled, add RLS policies that expose only public, active catalog records and never expose operational sync data unnecessarily.

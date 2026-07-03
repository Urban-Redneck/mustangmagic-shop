# MustangMagic.store Supabase V1

This directory contains the production-ready V1 Supabase catalog schema for MustangMagic.store.

The schema is intentionally limited to catalog and Turn14 sync data. It does not include authentication, users, carts, checkout, payments, or orders.

## Files

- `schema.sql` - V1 catalog schema, including raw Turn14 item staging
- `seed.sql` - Mustang generation and curated category seed data

## Architecture

Supabase is the store database and storefront read model. Turn14 is the upstream supplier data source.

```txt
Turn14 API
  -> sync/import process
  -> Supabase catalog tables
  -> Next.js Server Components
  -> MustangMagic.store shoppers
```

The website should not expose the full Turn14 product list. Imported products should be curated before they appear publicly. In V1, use:

- `products.active`
- `products.storefront_visible`
- `products.featured`

Turn14 data can exist in Supabase while remaining hidden from the storefront.
The raw `turn14_items_export.json` shape is supported by `turn14_items_exp`
before records are promoted into curated storefront products.

## Apply Schema

For a fresh Supabase project, run:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

Or paste `schema.sql` first, then `seed.sql`, into the Supabase SQL editor.

With the Supabase CLI, create a migration and copy the schema into it:

```bash
supabase migration new v1_catalog_schema
supabase db push
```

Then apply `seed.sql` through the SQL editor or a seed workflow.

## Tables

### `brands`

Stores manufacturers and brands.

Key fields:

- `id` - UUID primary key
- `turn14_id` - external Turn14 brand identifier when available
- `name`
- `slug`
- `logo_url`
- `website_url`
- `created_at`
- `updated_at`

Unique constraints:

- `turn14_id`
- `slug`

### `mustang_generations`

Stores top-level Mustang browse groups.

Seeded values:

```txt
fox-body   Fox Body   1979-1993
sn95       SN95       1994-2004
s197       S197       2005-2014
s550       S550       2015-2023
s650       S650       2024-present
```

### `categories`

Stores curated MustangMagic parts categories. These are shopper-facing categories, not raw Turn14 categories.

Seeded categories:

```txt
Engine
Exhaust
Fuel System
Forced Induction
Suspension
Brakes
Drivetrain
Wheels & Tires
Exterior
Interior
Electronics
```

Use these categories inside each generation. For example:

```txt
Fox Body -> Exhaust
S550 -> Forced Induction
S650 -> Electronics
```

The schema keeps categories global and combines them with `product_fitments.generation_id` at query time.

### `turn14_items_exp`

Raw staging table for records from `turn14_items_export.json`.

The export shape is:

```json
{
  "id": "078595",
  "type": "Item",
  "attributes": {
    "product_name": "...",
    "part_number": "...",
    "mfr_part_number": "...",
    "part_description": "...",
    "category": "...",
    "subcategory": "...",
    "dimensions": [],
    "brand_id": 148,
    "brand": "...",
    "price_group_id": 406,
    "price_group": "...",
    "active": true,
    "warehouse_availability": []
  }
}
```

`turn14_items_exp` stores this data in typed columns plus `raw_json`.

Use this table to ingest the full supplier export without publishing everything
to the storefront. A separate curation/promotion step should create or update
records in `products`, `brands`, `product_images`, and relationship tables.

### `products`

Stores normalized product records imported from Turn14 and curated for the storefront.

Key fields:

- `id` - UUID primary key
- `turn14_id` - required external Turn14 product identifier
- `turn14_type`
- `brand_id` - foreign key to `brands`
- `part_number`
- `manufacturer_part_number`
- `alternate_part_number`
- `barcode`
- `name`
- `slug`
- `short_description`
- `description`
- `turn14_category`
- `turn14_subcategory`
- `primary_image_url`
- `price`
- `map_price`
- `msrp`
- `price_group_id`
- `price_group`
- `inventory_status`
- `active`
- `storefront_visible`
- `featured`
- `discontinued`
- Turn14 compliance, freight, stock, and package fields
- `dimensions`
- `warehouse_availability`
- `contents`
- `raw_turn14_json`
- `turn14_updated_at`
- `search_document`
- `created_at`
- `updated_at`

Important curation rule:

`active` and `storefront_visible` default to `false`. Turn14 imports should not automatically publish products to the website.

Allowed `inventory_status` values:

```txt
unknown
in_stock
low_stock
out_of_stock
discontinued
special_order
```

### `product_categories`

Many-to-many join between `products` and `categories`.

Use `is_primary = true` for one main category per product. A partial unique index enforces one primary category per product.

### `product_fitments`

Stores year-specific Mustang fitment records.

Key fields:

- `product_id`
- `generation_id`
- `year`
- `make`
- `model`
- `trim`
- `engine`
- `source`
- `source_fitment_id`

Fitment remains year-specific even when mapped to a generation, so filtering can support exact year and generation-level browsing.

### `product_images`

Stores product image records.

Key fields:

- `product_id`
- `turn14_id`
- `url`
- `alt_text`
- `sort_order`
- `is_primary`
- `width`
- `height`

A partial unique index enforces one primary image per product.

### `sync_runs`

Tracks import and sync operations.

Allowed `sync_type` values:

```txt
brands
categories
fitments
full
images
inventory
pricing
products
```

Allowed `status` values:

```txt
running
succeeded
failed
partial
```

## Indexes

The schema includes indexes for:

- Slug lookup: brands, categories, generations, products
- Turn14 lookup: brands, products, product images
- Raw export lookup: Turn14 ID, brand ID, part numbers, category/subcategory, processed state
- Product listing filters: brand, active, storefront visibility, inventory, price, featured
- Category lookup: product/category joins
- Fitment lookup: product, generation, year, generation/year, engine
- Product images: product and sort order
- Full-text search: generated `products.search_document`
- Sync monitoring: source, sync type, status, started time

## Turn14 Import Rules

Turn14 import code should:

- Ingest the raw JSON export into `turn14_items_exp` first.
- Upsert `brands` by `turn14_id` when available.
- Upsert `products` by `turn14_id`.
- Store Turn14 part numbers in `products.part_number` and/or `products.manufacturer_part_number`.
- Store Turn14 category/subcategory in `products.turn14_category` and `products.turn14_subcategory`.
- Store dimensions, warehouse availability, kit contents, compliance flags, barcode, and freight flags.
- Store complete upstream payloads in `products.raw_turn14_json`.
- Insert images into `product_images`.
- Map products to curated categories through `product_categories`.
- Map fitments to `mustang_generations` through `product_fitments.generation_id`.
- Mark discontinued products inactive.
- Leave new products hidden until curated by setting `storefront_visible = false`.
- Record every run in `sync_runs`.

## Storefront Query Rule

Public product listings should only show products where:

```sql
active = true
and storefront_visible = true
```

Do not expose raw Turn14 inventory as the public website catalog.

## Security

- Do not expose Supabase service role keys to browser code.
- Do not expose Turn14 credentials to browser code.
- Use environment variables for all secrets.
- Keep sync scripts and write operations server-side.
- Add Row Level Security policies before allowing browser-side Supabase access.

## Not Included

This V1 schema intentionally does not include:

- Users
- Auth profiles
- Carts
- Checkout sessions
- Orders
- Payments
- Stripe webhook tables

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MustangMagic.store Agent Instructions

## 1. Project Goal

MustangMagic.store is a Next.js 16 App Router ecommerce site for Mustang Magic & American Speed.

The immediate goal is to build a production-ready Mustang parts catalog. The catalog should use Supabase as the storefront database and Turn14 as the upstream product data source. Focus on product discovery, Mustang fitment, curated categories, product pages, and reliable sync before adding checkout.

## 2. Tech Stack

- Use Next.js 16 App Router.
- Use TypeScript.
- Use Tailwind CSS 4.
- Use Supabase as the store database.
- Use Turn14 as the upstream product data source.
- Prefer Server Components for product, category, brand, generation, and search pages.
- Use Client Components only for cart controls, filters, sorting, and interactive UI that requires browser state.

Before writing Next.js code, read the relevant local documentation in `node_modules/next/dist/docs/`.

## 3. Business Rules

- Focus the catalog on Mustang parts first.
- Treat Supabase as the normalized storefront read model.
- Treat Turn14 as the source of upstream product, pricing, inventory, brand, and fitment data.
- Use curated Mustang categories:
  - Exhaust
  - Suspension
  - Intake
  - Forced Induction
  - Tuning
  - Brakes
  - Fuel System
  - Drivetrain
  - Wheels
  - Exterior
  - Maintenance
- Do not build checkout until the catalog and Turn14 product sync are working.
- Do not trust browser-submitted prices.
- Revalidate price and inventory before checkout.
- Keep code simple, maintainable, and production-ready.

## 4. Security Rules

- Do not expose Turn14 credentials to the browser.
- Do not expose Supabase service role keys to the browser.
- Do not expose Stripe keys or webhook secrets to the browser.
- Do not expose cron secrets to the browser.
- Use environment variables for all secrets.
- Only `NEXT_PUBLIC_*` environment variables may be read by browser code.
- Keep Turn14 sync, Supabase service-role writes, Stripe calls, and cron endpoints server-only.
- Never commit `.env`, `.env.local`, production secrets, API tokens, or generated credential files.

## 5. Folder Conventions

Recommended structure:

```txt
src/
  app/
    page.tsx
    parts/
    brands/
    generations/
    products/
    search/
    api/
  components/
    catalog/
    layout/
    ui/
  lib/
    catalog/
    supabase/
    turn14/
  types/

scripts/
  sync_turn14.py

supabase/
  schema.sql
  README.md
```

Guidelines:

- Keep route files thin.
- Put catalog queries in `src/lib/catalog/`.
- Put Supabase clients in `src/lib/supabase/`.
- Put Turn14 integration code in server-only modules or scripts.
- Keep reusable presentational components in `src/components/`.
- Do not add checkout folders or payment code until explicitly requested.

## 6. Database Rules

- Supabase PostgreSQL is the store database.
- Use UUID primary keys where appropriate.
- Store Turn14 product IDs as external identifiers.
- Preserve raw Turn14 payloads when useful for debugging and future enrichment.
- Use foreign keys for product relationships.
- Add indexes for product listing, search, categories, brands, fitment, and sync monitoring.
- Keep the schema focused on catalog and sync until checkout is approved.
- Do not add authentication, cart persistence, orders, payments, or checkout tables unless explicitly requested.

## 7. Turn14 Sync Rules

- Turn14 is upstream; Supabase is the storefront read model.
- Do not call Turn14 directly from public product listing pages.
- Sync Turn14 products into Supabase through server-only code or scripts.
- Make sync jobs paginated, resumable, and retry-safe.
- Upsert products by Turn14 product ID.
- Upsert brands and categories using stable unique identifiers.
- Mark missing or discontinued products inactive instead of deleting them.
- Track sync runs and failures.
- Use environment variables for Turn14 base URLs, credentials, tokens, and sync configuration.

## 8. UI Rules

- Build the actual storefront experience, not a marketing-only landing page.
- Product/category pages should be Server Components by default.
- Use Client Components only for interaction that needs browser state, such as:
  - cart controls
  - filter drawers
  - sort menus
  - quantity controls
  - interactive search refinements
- Use Tailwind 4 utilities and keep styling consistent with the existing storefront.
- Keep pages clear, fast, and catalog-focused.
- Use empty states that explain when Supabase has not been seeded or Turn14 sync has not run.
- Do not add checkout UI until checkout work is explicitly requested.

## 9. What Not To Do

- Do not expose secrets in client code.
- Do not use the Supabase service role key in Client Components.
- Do not call Turn14 from Client Components.
- Do not build checkout before catalog and product sync are working.
- Do not trust prices, inventory, or totals submitted from the browser.
- Do not add broad abstractions before the catalog needs them.
- Do not replace the App Router with the Pages Router.
- Do not add unrelated libraries or services without a clear need.
- Do not rewrite unrelated files or revert user changes.
- Before editing files, explain the plan unless the user explicitly asks you to implement immediately.

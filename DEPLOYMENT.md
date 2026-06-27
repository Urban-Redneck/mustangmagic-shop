# Deployment Checklist — mustangmagic.store

## ✅ Completed
- [x] Next.js 16.2.9 + Tailwind CSS 4 build succeeds
- [x] All pages compile (Home, Shop, Cart, Product Detail, Contact, Order Confirmed)
- [x] Supabase PostgreSQL schema created (`schema.sql`)
- [x] Supabase client library with lazy-init (builds without env vars)
- [x] Turn 14 dropship integration preserved + enhanced
- [x] YMM filter support in product API
- [x] Brand/category mapping from Turn 14 categories
- [x] mustangmagic.store domain already registered on Vercel

## 🔧 Pending — John's Action Required

### Step 1: Set up Supabase database
1. Go to https://supabase.com → Create new project (or use existing)
2. Open SQL Editor and run the full contents of `schema.sql`
3. This creates all tables: categories, brands, products, vehicle_generations, product_fitments, orders, cart_sessions, reviews, settings
4. Copy these values from Project Settings → API:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (secret — only this for admin writes)

### Step 2: Add Supabase env vars to Vercel
Run these in the terminal:

```bash
cd mustangmagic-shop
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production  
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

(Enter the values when prompted from your Supabase project settings.)

### Step 3: Add domain to Vercel production
```bash
cd mustangmagic-shop
npx vercel domains add mustangmagic.store --environment production
```

### Step 4: Deploy to production
```bash
cd mustangmagic-shop
npx vercel --prod
```

## After deployment

1. Run the Turn 14 product sync to seed products:
   ```
   curl -X POST https://mustangmagic.store/api/products?action=sync \
     -H "x-secret-key: $SYNC_SECRET_KEY"
   ```

2. Populate brand and category data from Turn 14 API (the `brands` action):
   ```
   curl https://mustangmagic.store/api/products?action=brands
   ```

3. Verify the site loads at https://mustangmagic.store

## Architecture

```
User → mustangmagic.store (Vercel) → Next.js 16 Serverless Functions
                                      ├── Supabase PostgreSQL (products, categories, fitments, orders, cart)
                                      ├── Turn 14 API (live inventory/pricing/dropship orders)
                                      └── Stripe (checkout payments)
```

## Notes
- Redis cart is replaced by Supabase `cart_sessions` table for cross-device persistence
- Product catalog syncs from Turn 14 to Supabase (not live — cached with periodic refresh)
- Dropship orders placed directly via Turn 14 API during checkout
- YMM fitment data stored in relational `product_fitments` table linked to `vehicle_generations`

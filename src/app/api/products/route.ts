import { NextRequest, NextResponse } from 'next/server';
import { searchMustangProducts, syncMustangProducts, getAccessTokenFromAPI, getAllBrands, getSingleItem, getItemPricing, getItemInventory } from '@/lib/turn14';
import { supabaseAdmin, getProductById, getProductBySku, getProducts } from '@/lib/supabase';
import { T14_TO_CATEGORY_MAP } from '@/lib/turn14-categories';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Full sync (admin only — triggers catalog pull from Turn 14)
    if (action === 'sync' && request.headers.get('x-secret-key') === process.env.SYNC_SECRET_KEY) {
      try {
        const creds = {
          clientId: process.env.TURN14_CLIENT_ID!,
          clientSecret: process.env.TURN14_CLIENT_SECRET!,
        };
        const products = await syncMustangProducts(creds);
        return NextResponse.json({ success: true, count: products.length, products });
      } catch (error) {
        console.error('Turn 14 sync error:', error);
        return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 502 });
      }
    }

    // Verify credentials / get token (for setup/testing)
    if (action === 'test-auth') {
      try {
        const creds = {
          clientId: process.env.TURN14_CLIENT_ID!,
          clientSecret: process.env.TURN14_CLIENT_SECRET!,
        };
        await getAccessTokenFromAPI(creds);
        return NextResponse.json({ success: true, message: 'Turn 14 credentials valid' });
      } catch (error) {
        console.error('Turn 14 auth error:', error);
        return NextResponse.json({ 
          error: 'Turn 14 auth failed', 
          details: String(error),
          hint: 'Check your client_id and client_secret at https://www.turn14.com/options.php'
        }, { status: 401 });
      }
    }

    // Get YMM fitment filter counts
    if (action === 'fitment-counts') {
      try {
        const { data: counts } = await supabaseAdmin!.from('product_fitments')
          .select('year, generation, body_style')
          .order('year', { ascending: false });
        return NextResponse.json({ fitmentCounts: counts || [] });
      } catch (error) {
        return NextResponse.json({ fitmentCounts: [] });
      }
    }

    // List brands available via Supabase and Turn 14
    if (action === 'brands') {
      try {
        const creds = {
          clientId: process.env.TURN14_CLIENT_ID!,
          clientSecret: process.env.TURN14_CLIENT_SECRET!,
        };
        const { brands } = await getAllBrands(creds);
        return NextResponse.json({ brands: brands.slice(0, 200) });
      } catch (error) {
        console.error('Turn 14 brands error:', error);
        return NextResponse.json({ brands: [] });
      }
    }

    // Look up a single product by Supabase ID or SKU
    const productId = searchParams.get('product_id');
    if (productId) {
      try {
        // Check if it's a UUID (Supabase internal ID)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
          const product = await getProductById(productId).catch(() => null);
          if (product) {
            return NextResponse.json({
              product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                shortDescription: product.short_description,
                longDescription: product.long_description,
                price: product.price,
                mapPrice: product.map_price ?? 0,
                listPrice: product.list_price ?? 0,
                brandName: product.brand?.name || 'Unknown',
                category: product.category?.name || '',
                subcategory: product.subcategory?.name || '',
                imageUrl: (product.images as any[])?.find((img: any) => img.primary)?.url || '',
                imageUrls: (product.images as any[])?.filter((img: any) => !img.primary).map((img: any) => img.url) || [],
                active: product.active,
                fitments: (product.fitments as any[])?.map((f: any) => ({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine })) || [],
              },
            });
          }
        } else {
          // Try SKU lookup
          const product = await getProductBySku(productId).catch(() => null);
          if (product) {
            return NextResponse.json({
              product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                shortDescription: product.short_description,
                longDescription: product.long_description,
                price: product.price,
                mapPrice: product.map_price ?? 0,
                listPrice: product.list_price ?? 0,
                brandName: product.brand?.name || 'Unknown',
                category: product.category?.name || '',
                subcategory: product.subcategory?.name || '',
                imageUrl: (product.images as any[])?.find((img: any) => img.primary)?.url || '',
                imageUrls: (product.images as any[])?.filter((img: any) => !img.primary).map((img: any) => img.url) || [],
                active: product.active,
                fitments: (product.fitments as any[])?.map((f: any) => ({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine })) || [],
              },
            });
          }
        }
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      } catch (error) {
        console.error('Product lookup error:', error);
        return NextResponse.json({ error: 'Failed to look up product', details: String(error) }, { status: 502 });
      }
    }

    // Look up a single item by Turn 14 item ID (legacy support)
    if (action === 'item' && searchParams.has('id')) {
      try {
        const creds = {
          clientId: process.env.TURN14_CLIENT_ID!,
          clientSecret: process.env.TURN14_CLIENT_SECRET!,
        };
        const item = await getSingleItem(searchParams.get('id')!, creds);
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        return NextResponse.json({ item });
      } catch (error) {
        console.error('Turn 14 item lookup error:', error);
        return NextResponse.json({ error: 'Failed to look up item', details: String(error) }, { status: 502 });
      }
    }

    // Search — keyword only (Turn 14 has no YMM server-side search)
    const keyword = searchParams.get('keyword');
    const brandSlug = searchParams.get('brand');
    const categorySlug = searchParams.get('category');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const generation = searchParams.get('generation');

    // === Try Supabase first (for synced catalog) ===
    if (keyword || brandSlug || categorySlug) {
      const supabaseProducts = await getProducts({
        search: keyword || undefined,
        brandSlug: brandSlug || undefined,
        categorySlug: categorySlug || undefined,
        year,
        generation: generation || undefined,
        sortBy: 'relevance' as any,
        limit: 100,
      }).catch(() => []);

      if (supabaseProducts && supabaseProducts.length > 0) {
        // Transform Supabase row format to frontend format
        const formatted = supabaseProducts.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          turn14ItemId: p.turn14_item_id || undefined,
          name: p.name,
          shortDescription: p.short_description,
          longDescription: p.long_description,
          price: p.price,
          mapPrice: p.map_price ?? 0,
          listPrice: p.list_price ?? 0,
          purchaseCost: p.purchase_cost ?? undefined,
          brandName: p.brand?.name || 'Unknown',
          category: p.category?.name || '',
          subcategory: p.subcategory?.name || '',
          imageUrl: (p.images as any[])?.find((img: any) => img.primary)?.url || '',
          imageUrls: (p.images as any[])?.filter((img: any) => !img.primary).map((img: any) => img.url) || [],
          inStock: p.active,
          fitments: (p.fitments as any[])?.map((f: any) => ({
            year: f.year,
            generation: f.generation,
            body_style: f.body_style,
            engine: f.engine,
          })) || [],
        }));
        return NextResponse.json({ products: formatted, total: formatted.length, source: 'supabase' });
      }
    }

    // Fall back to Turn 14 API
    if (keyword || brandSlug) {
      try {
        const creds = {
          clientId: process.env.TURN14_CLIENT_ID!,
          clientSecret: process.env.TURN14_CLIENT_SECRET!,
        };
        let products = await searchMustangProducts(keyword ?? '', brandSlug ?? undefined, creds);

        // Enrich with pricing and inventory
        if (products.length > 0) {
          const itemIds = products.map(p => p.turn14ItemId);
          const [pricingResults, invResults] = await Promise.all([
            Promise.all(itemIds.map(id => getItemPricing(id, creds).catch(() => null))),
            Promise.all(itemIds.map(id => getItemInventory([id], creds).then(m => m.get(id) || {})))
          ]);

          products = products.map((p, i) => {
            const pricing = pricingResults[i];
            const inv = invResults[i] as any;
            let purchaseCost = 0;
            if (pricing?.pricelists) {
              const jobber = pricing.pricelists.find((pl: any) => pl.name.toLowerCase() === 'jobber');
              const map = pricing.pricelists.find((pl: any) => pl.name.toLowerCase() === 'map');
              if (jobber) purchaseCost = jobber.price;
              else if (map) purchaseCost = Math.round(map.price * 0.7);
            } else {
              purchaseCost = pricing?.purchase_cost ?? 0;
            }
            let totalInv = 0;
            if (inv?.inventory) for (const v of Object.values(inv.inventory)) totalInv += Number(v);

            return {
              ...p,
              purchaseCost,
              priceLists: pricing?.pricelists ?? [],
              inventory: inv?.inventory ?? {},
              totalInventory: totalInv,
            };
          });
        }

        // Filter: only items with valid dealer pricing (cost > 0 or MAP pricelist exists)
        const priced = products.filter((p: any) => {
          if (p.purchaseCost > 0) return true;
          if (p.priceLists?.length > 0) return true;
          if ((p as any).prices?.length > 0) return true;
          return false;
        });

        // Filter: only items that are active AND have some inventory available
        const inStock = priced.filter((p: any) => {
          if (!p.active) return false;
          // If Turn 14 returned zero total inventory and no manufacturer stock, skip
          if (p.totalInventory === 0 && p.hasManufacturerStock === false && !p.regularStock) {
            return false;
          }
          return true;
        });

        // Map to frontend Product format with pricing for display
        const apiProducts = inStock.map((p: any) => ({
          id: `t14-${p.turn14ItemId}`,
          sku: p.turn14PartNumber,
          turn14ItemId: p.turn14ItemId,
          name: p.productName,
          shortDescription: p.partDescription,
          longDescription: p.partDescription,
          price: p.purchaseCost > 0 ? Math.round(p.purchaseCost * 1.43) : (p.priceLists?.find((pl: any) => pl.name === 'MAP')?.price ?? 0),
          mapPrice: p.priceLists?.find((pl: any) => pl.name === 'MAP')?.price ?? 0,
          listPrice: p.priceLists?.find((pl: any) => pl.name === 'Retail')?.price ?? 0,
          brandName: p.brandName,
          category: p.category,
          imageUrl: p.thumbnail || '',
          imageUrls: [],
          inStock: true,
          totalInventory: p.totalInventory,
          purchaseCost: p.purchaseCost,
          priceLists: p.priceLists,
          yearMakeModel: [],
        }));
        return NextResponse.json({ products: apiProducts.slice(0, 100), total: apiProducts.length });
      } catch (error) {
        console.error('Turn 14 search error:', error);
        return NextResponse.json({ products: [], total: 0 });
      }
    }

    // No query — return empty (catalog sync required first for real data)
    return NextResponse.json({ products: [], total: 0, message: 'Use ?keyword= or ?action=brands' });
  } catch (error) {
    console.error('Product API error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

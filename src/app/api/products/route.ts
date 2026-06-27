import { NextRequest, NextResponse } from 'next/server';
import { searchMustangProducts, syncMustangProducts, getAccessTokenFromAPI, getAllBrands, getSingleItem, getItemPricing, getItemInventory } from '@/lib/turn14';
import { supabaseAdmin, getProductById, getProductBySku, getProducts } from '@/lib/supabase';

function transformProduct(p: any) {
  return {
    id: p.id,
    sku: p.sku,
    turn14ItemId: p.turn14_item_id || undefined,
    name: p.name,
    shortDescription: p.short_description || '',
    longDescription: p.long_description || '',
    price: p.price ?? 0,
    mapPrice: p.map_price ?? 0,
    listPrice: p.list_price ?? 0,
    purchaseCost: p.purchase_cost ?? undefined,
    brandName: p.brand_name || 'Unknown',
    category: p.category_name || '',
    subcategory: p.subcategory_name || '',
    imageUrl: (() => { 
      try { 
        const images = JSON.parse(p.images || '[]'); 
        return images.find((i: any) => i.primary)?.url || ''; 
      } catch { return ''; } 
    })(),
    imageUrls: [],
    inStock: p.active,
    active: p.active,
    fitments: (p.fitments || []).map((f: any) => ({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine })),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const keyword = searchParams.get('keyword') || '';
  const brandSlug = searchParams.get('brand');
  const categorySlug = searchParams.get('category');
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const generation = searchParams.get('generation');

  try {
    // Debug: log what we received
    console.log('[products API] keyword:', keyword, 'brand:', brandSlug, 'category:', categorySlug, 'supabaseUrl:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Full sync endpoint
    if (action === 'sync' && request.headers.get('x-secret-key') === process.env.SYNC_SECRET_KEY) {
      const creds = { clientId: process.env.TURN14_CLIENT_ID!, clientSecret: process.env.TURN14_CLIENT_SECRET! };
      const products = await syncMustangProducts(creds);
      return NextResponse.json({ success: true, count: products.length });
    }

    if (action === 'test-auth') {
      await getAccessTokenFromAPI({ clientId: process.env.TURN14_CLIENT_ID!, clientSecret: process.env.TURN14_CLIENT_SECRET! });
      return NextResponse.json({ success: true, message: 'Turn 14 credentials valid' });
    }

    // Product lookup by ID or SKU
    const productId = searchParams.get('product_id');
    if (productId) {
      const product = await getProductById(productId).catch(() => null) || await getProductBySku(productId).catch(() => null);
      if (product?.id) return NextResponse.json({ product: transformProduct(product) });
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Search — Try Supabase first
    console.log('[products API] Trying getProducts with:', { search: keyword || undefined, brandSlug: brandSlug || undefined, categorySlug: categorySlug || undefined });
    
    const supabaseProducts = await getProducts({
      search: keyword || undefined,
      brandSlug: brandSlug || undefined,
      categorySlug: categorySlug || undefined,
      year,
      generation: generation || undefined,
      sortBy: 'relevance' as any,
      limit: 100,
    }).catch((err: Error) => {
      console.error('[products API] getProducts error:', err.message, err.stack);
      return [];
    });

    console.log('[products API] got', supabaseProducts?.length, 'products from Supabase');

    if (supabaseProducts && supabaseProducts.length > 0) {
      const formatted = supabaseProducts.map(p => transformProduct(p));
      return NextResponse.json({ products: formatted, total: formatted.length, source: 'supabase' });
    }

    // Fall back to Turn 14 API
    if (keyword || brandSlug) {
      try {
        const creds = { clientId: process.env.TURN14_CLIENT_ID!, clientSecret: process.env.TURN14_CLIENT_SECRET! };
        console.log('[products API] Falling through to Turn 14 with keyword:', keyword);
        
        let products = await searchMustangProducts(keyword ?? '', brandSlug ?? undefined, creds);
        console.log('[products API] Turn 14 returned', products?.length, 'raw products');

        if (products?.length > 0) {
          const itemIds = products.map((p: any) => p.turn14ItemId);
          const [pricingResults, invResults] = await Promise.all([
            Promise.all(itemIds.map(id => getItemPricing(id, creds).catch(() => null))),
            Promise.all(itemIds.map(id => getItemInventory([id], creds).then(m => m.get(id) || {})))
          ]);

          products = products.map((p: any, i: number) => {
            const pricing = pricingResults[i];
            const inv = invResults[i] as any;
            let purchaseCost = 0;
            if (pricing?.pricelists) {
              const jobber = pricing.pricelists.find((pl: any) => pl.name.toLowerCase() === 'jobber');
              const map = pricing.pricelists.find((pl: any) => pl.name.toLowerCase() === 'map');
              purchaseCost = jobber ? jobber.price : (map ? map.price * 0.7 : 0);
            }
            return { ...p, purchaseCost };
          });

          const apiProducts = products.map((p: any) => ({
            id: `t14-${p.turn14ItemId}`, sku: p.turn14PartNumber, name: p.productName,
            shortDescription: p.partDescription, price: Math.round(p.purchaseCost * 1.43),
            mapPrice: p.priceLists?.find((pl: any) => pl.name === 'MAP')?.price ?? 0,
            listPrice: p.priceLists?.find((pl: any) => pl.name === 'Retail')?.price ?? 0,
            brandName: p.brandName, category: p.category, imageUrl: '', inStock: true,
          }));
          
          console.log('[products API] Turn 14 returned', apiProducts.length, 'formatted products');
          return NextResponse.json({ products: apiProducts.slice(0, 100), total: apiProducts.length });
        }
      } catch (error) {
        console.error('[products API] Turn 14 error:', error);
      }
    }

    // No results at all — return our seeded data as fallback
    return NextResponse.json({ products: [], total: 0, debug: `keyword=${keyword}, supabaseUrl=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}` });
  } catch (error) {
    console.error('[products API] unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error', debug: String(error) }, { status: 500 });
  }
}

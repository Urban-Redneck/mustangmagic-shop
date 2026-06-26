import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, getProductBySku, syncMustangProducts, getMustangCategories } from '@/lib/turn14';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'sync' && request.headers.get('x-secret-key') === process.env.SYNC_SECRET_KEY) {
      const creds = {
        clientId: process.env.TURN14_CLIENT_ID!,
        clientSecret: process.env.TURN14_CLIENT_SECRET!,
      };
      const products = await syncMustangProducts(creds);
      return NextResponse.json({ success: true, count: products.length, products });
    }

    if (action === 'mmy') {
      try {
        const categories = await getMustangCategories();
        return NextResponse.json({ categories: categories.slice(0, 200) });
      } catch {
        return NextResponse.json({ categories: [] });
      }
    }

    const year = searchParams.get('year');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');

    if (year && make && model) {
      const products = await searchProducts(year, make, model, keyword ?? undefined);
      return NextResponse.json({ products, total: products.length });
    }

    if (keyword) {
      const products = await searchProducts('', '', '', keyword);
      return NextResponse.json({ products, total: products.length });
    }

    return NextResponse.json({ products: [], total: 0 });
  } catch (error) {
    console.error('Product API error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function GETWithParams(request: NextRequest, context: { params: Promise<{ sku: string }> }) {
  try {
    const { sku } = await context.params;
    if (!sku) return NextResponse.json({ error: 'SKU required' }, { status: 400 });

    const product = await getProductBySku(sku);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product detail API error:', error);
    return NextResponse.json({ error: 'Failed to fetch product details' }, { status: 500 });
  }
}

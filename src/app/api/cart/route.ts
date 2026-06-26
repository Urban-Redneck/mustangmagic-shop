import { NextRequest, NextResponse } from 'next/server';
import * as redis from '@/lib/redis';
import { getProductBySku } from '@/lib/turn14';

export async function GET(request: NextRequest) {
  try {
    const cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) return NextResponse.json({ items: [], total: 0 });

    const items = await redis.getCart(cartId);
    if (items.length === 0) return NextResponse.json({ items: [], total: 0 });

    const enrichedItems = [];
    for (const item of items) {
      const product = await getProductBySku(item.product_id);
      if (product && product.inStock) {
        enrichedItems.push({ product, quantity: item.quantity });
      } else if (product) {
        enrichedItems.push({ product, quantity: item.quantity, outOfStock: true });
      }
    }

    const total = enrichedItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    return NextResponse.json({ items: enrichedItems, total });
  } catch (error) {
    console.error('Cart API error:', error);
    return NextResponse.json({ error: 'Failed to load cart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) cartId = crypto.randomUUID();

    const success = await redis.addToCart(cartId, body.sku, body.quantity || 1);
    if (!success) {
      return NextResponse.json({ error: 'Could not add item to cart' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, cartId });
    response.cookies.set('cart_id', cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json({ error: 'Could not add item to cart' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });

    const body = await request.json();
    const url = new URL(request.url);
    const sku = url.pathname.split('/').pop() || '';

    if (body.quantity <= 0) {
      await redis.removeFromCart(cartId, sku);
    } else {
      const currentList = await redis.getCart(cartId);
      const current = currentList.find(i => i.product_id === sku)?.quantity || 0;
      const diff = body.quantity - current;
      await redis.addToCart(cartId, sku, diff);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json({ error: 'Could not update cart' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });

    const url = new URL(request.url);
    const sku = url.searchParams.get('sku');

    if (sku) {
      await redis.removeFromCart(cartId, sku);
    } else {
      await redis.clearCart(cartId);
      const response = NextResponse.json({ success: true });
      response.cookies.set('cart_id', '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json({ error: 'Could not clear cart' }, { status: 500 });
  }
}

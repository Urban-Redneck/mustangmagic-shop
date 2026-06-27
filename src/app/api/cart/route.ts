import { NextRequest, NextResponse } from 'next/server';
import * as redis from '@/lib/redis';
import { getSingleItem, getItemInventory, getAccessTokenFromAPI } from '@/lib/turn14';

const creds = {
  clientId: process.env.TURN14_CLIENT_ID!,
  clientSecret: process.env.TURN14_CLIENT_SECRET!,
};

async function fetchCartInventory(itemIds: string[]): Promise<Map<string, Record<string, number>>> {
  if (itemIds.length === 0) return new Map();
  try {
    const map = await getItemInventory(itemIds, creds);
    const result = new Map<string, Record<string, number>>();
    for (const [id, data] of map) {
      result.set(id, data.inventory || {});
    }
    return result;
  } catch {
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  try {
    const cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) return NextResponse.json({ items: [], total: 0 });

    const items = await redis.getCart(cartId);
    if (items.length === 0) return NextResponse.json({ items: [], total: 0 });

    // Batch-fetch inventory for all cart items
    const itemIds = items.map(i => i.product_id);
    const invMap = await fetchCartInventory(itemIds);

    const enrichedItems = [];
    for (const item of items) {
      const product = await getSingleItem(item.product_id, creds);
      
      let totalInv = 0;
      const inv = invMap.get(item.product_id);
      if (inv) {
        for (const qty of Object.values(inv)) totalInv += qty as number;
      }

      enrichedItems.push({
        turn14ItemId: item.product_id,
        quantity: item.quantity,
        inStock: totalInv > 0,
        totalInventory: totalInv,
        productName: product?.product_name || '',
        brandName: product?.brand || '',
      });
    }

    return NextResponse.json({ items: enrichedItems, total: 0 });
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

    // Verify the item exists in Turn 14 before adding to cart
    const productId = body.turn14ItemId || body.sku;
    if (productId && creds.clientId && creds.clientSecret) {
      try {
        await getAccessTokenFromAPI(creds); // warm token cache
        const item = await getSingleItem(productId, creds);
        if (!item || !item.active) {
          return NextResponse.json({ error: 'Item no longer available' }, { status: 400 });
        }
      } catch (err) {
        console.warn('T14 lookup failed, adding anyway:', err);
      }
    }

    const success = await redis.addToCart(cartId, productId, body.quantity || 1);
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
    const productId = url.pathname.split('/').pop() || '';

    if (body.quantity <= 0) {
      await redis.removeFromCart(cartId, productId);
    } else {
      const currentList = await redis.getCart(cartId);
      const current = currentList.find(i => i.product_id === productId)?.quantity || 0;
      const diff = body.quantity - current;
      await redis.addToCart(cartId, productId, diff);
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
    const productId = url.searchParams.get('sku');

    if (productId) {
      await redis.removeFromCart(cartId, productId);
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

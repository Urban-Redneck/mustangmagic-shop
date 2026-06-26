import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = body.items as Array<{ sku: string; name: string; quantity: number; price: number; imageUrl?: string }>;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    // Build Stripe line items from cart
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: item.imageUrl ? [item.imageUrl] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
      metadata: {
        cart_items: JSON.stringify(items.map(i => ({ sku: i.sku, name: i.name, quantity: i.quantity }))),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

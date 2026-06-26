import { NextRequest, NextResponse } from 'next/server';

const GODADDY_API_BASE = process.env.GODADDY_ENVIRONMENT === 'production'
  ? 'https://api.godaddy.com'
  : 'https://api.sandbox.godaddy.com';

interface GoDaddyProduct {
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cartId = request.cookies.get('cart_id')?.value;
    if (!cartId) return NextResponse.json({ error: 'No active cart' }, { status: 400 });

    const cartItems = body.items as Array<{ sku: string; name: string; quantity: number; price: number }>;

    const products: GoDaddyProduct[] = cartItems.map(item => ({
      sku: item.sku,
      name: item.name,
      unitPrice: Math.round(item.price * 100),
      quantity: item.quantity,
    }));

    const checkoutPayload = {
      redirect_url: process.env.NEXT_PUBLIC_SITE_URL + '/order-confirmed',
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + '/checkout',
      billing_address_required: true,
      products,
      currency: 'USD',
      description: `Mustang Magic order #${cartId}`,
    };

    const response = await fetch(`${GODADDY_API_BASE}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GODADDY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-GODPAY-KEY': process.env.GODADDY_MERCHANT_ID!,
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoDaddy checkout API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create checkout session', details: errorText },
        { status: 502 }
      );
    }

    const checkoutData = await response.json();

    return NextResponse.json({
      checkoutUrl: checkoutData.checkout_url || checkoutData.url,
      sessionId: checkoutData.id,
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

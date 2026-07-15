import { NextResponse, type NextRequest } from "next/server";
import { getCartItems } from "@/lib/cart/server";
import {
  getCheckoutProductById,
  getCheckoutProductsByIds,
} from "@/lib/checkout/products";
import { buildStripeLineItem } from "@/lib/checkout/stripe-line-items";
import { getStripeServerClient } from "@/lib/stripe/server";

const MAX_QUANTITY = 10;

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return checkoutError(request, "Stripe is not configured.", 503);
  }

  const formData = await request.formData();
  const checkoutMode = stringValue(formData.get("checkoutMode"));
  if (checkoutMode === "cart") {
    return createCartCheckoutSession(request);
  }

  const productId = stringValue(formData.get("productId"));
  const quantity = parseQuantity(formData.get("quantity"));

  if (!productId) {
    return checkoutError(request, "Missing product id.", 400);
  }

  if (quantity === null) {
    return checkoutError(request, "Invalid quantity.", 400);
  }

  const product = await getCheckoutProductById(productId);
  if (!product) {
    return checkoutError(request, "Product is not available.", 404);
  }

  if (!product.canPurchase) {
    return checkoutError(request, "Product cannot be purchased right now.", 409);
  }

  const origin = siteOrigin(request);
  const productUrl = `${origin}/products/${product.slug}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: product.id,
    line_items: [
      buildStripeLineItem(product, quantity),
    ],
    metadata: {
      product_id: product.id,
      turn14_id: product.turn14Id,
      part_number: product.partNumber,
      inventory_status: product.inventoryStatus,
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${productUrl}?checkout=cancelled`,
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true,
    },
  });

  if (!session.url) {
    return checkoutError(request, "Stripe did not return a checkout URL.", 502);
  }

  return NextResponse.redirect(session.url, 303);
}

async function createCartCheckoutSession(request: NextRequest) {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return checkoutError(request, "Stripe is not configured.", 503);
  }

  const cartItems = await getCartItems();
  if (cartItems.length === 0) {
    return checkoutError(request, "Your cart is empty.", 400);
  }

  const products = await getCheckoutProductsByIds(
    cartItems.map((item) => item.productId),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const lineItems = cartItems.flatMap((item) => {
    const product = productById.get(item.productId);
    if (!product || !product.canPurchase) {
      return [];
    }
    return [buildStripeLineItem(product, item.quantity)];
  });

  if (lineItems.length === 0) {
    return checkoutError(
      request,
      "No cart items are available for checkout right now.",
      409,
    );
  }

  if (lineItems.length !== cartItems.length) {
    return checkoutError(
      request,
      "One or more cart items are no longer available for checkout.",
      409,
    );
  }

  const origin = siteOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    metadata: {
      cart_product_ids: cartItems.map((item) => item.productId).join(","),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart?checkout=cancelled`,
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true,
    },
  });

  if (!session.url) {
    return checkoutError(request, "Stripe did not return a checkout URL.", 502);
  }

  return NextResponse.redirect(session.url, 303);
}

function checkoutError(request: NextRequest, message: string, status: number) {
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ error: message }, { status });
  }

  const url = new URL("/checkout/cancel", siteOrigin(request));
  url.searchParams.set("reason", message);
  return NextResponse.redirect(url, 303);
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}

function parseQuantity(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 1;
  }

  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return null;
  }

  return quantity;
}

function siteOrigin(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    request.nextUrl.origin
  )
    .trim()
    .replace(/\/$/, "");
}

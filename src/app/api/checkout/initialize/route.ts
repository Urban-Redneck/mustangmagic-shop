import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";
import {
  discountedUnitAmountCents,
  getAppliedDiscount,
} from "@/lib/discounts/server";
import { initializeHelcimPaySession } from "@/lib/helcim/server";
import { createTurn14Quote } from "@/lib/turn14/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutRequest = {
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse("Checkout is temporarily unavailable.", 503);
  }

  let body: CheckoutRequest;
  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return errorResponse("Enter your contact and shipping information.", 400);
  }

  const contactName = text(body.contactName, 120);
  const contactEmail = text(body.contactEmail, 160).toLowerCase();
  const contactPhone = text(body.contactPhone, 40);
  const addressLine1 = text(body.addressLine1, 160);
  const addressLine2 = text(body.addressLine2, 160) || null;
  const city = text(body.city, 80);
  const state = text(body.state, 40).toUpperCase();
  const postalCode = text(body.postalCode, 20).toUpperCase();

  if (
    !contactName ||
    !contactEmail.includes("@") ||
    !contactPhone ||
    !addressLine1 ||
    !city ||
    !state ||
    !postalCode
  ) {
    return errorResponse("Complete all required contact and shipping fields.", 400);
  }

  const cartItems = await getCartItems();
  if (cartItems.length === 0) {
    return errorResponse("Your cart is empty.", 400);
  }

  const products = await getCheckoutProductsByIds(
    cartItems.map((item) => item.productId),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const rows = cartItems.map((item) => ({
    item,
    product: productById.get(item.productId) ?? null,
  }));

  if (rows.some((row) => !row.product || !row.product.canPurchase)) {
    return errorResponse(
      "One or more cart items are no longer available for online checkout.",
      409,
    );
  }

  const discount = await getAppliedDiscount();
  const subtotalCents = rows.reduce((sum, row) => {
    const product = row.product!;
    return (
      sum +
      discountedUnitAmountCents(
        dollarsToCents(product.price),
        discount,
        dollarsToCents(product.purchaseCost),
      ) * row.item.quantity
    );
  }, 0);
  const poNumber = `MM-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
  const recipient = {
    company: null,
    name: contactName,
    line1: addressLine1,
    line2: addressLine2,
    city,
    state,
    country: "US",
    postal_code: postalCode,
    phone: contactPhone,
    email: contactEmail,
  };

  let quote;
  try {
    quote = await createTurn14Quote({
      poNumber,
      items: rows.map(({ item, product }) => ({
        turn14Id: product!.turn14Id,
        quantity: item.quantity,
      })),
      recipient,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Turn14 quote failed.";
    console.error("Checkout Turn14 quote failed", message);
    return errorResponse(
      "We could not confirm shipping and availability. Please try again.",
      502,
    );
  }

  const shippingCents = dollarsToCents(quote.shippingTotal);
  const feeCents = dollarsToCents(quote.feeTotal);
  const totalCents = subtotalCents + shippingCents + feeCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    return errorResponse("The checkout total could not be calculated.", 502);
  }

  const cartSnapshot = rows.map(({ item, product }) => ({
    productId: product!.id,
    turn14Id: product!.turn14Id,
    partNumber: product!.partNumber,
    name: product!.name,
    quantity: item.quantity,
    unitAmount: discountedUnitAmountCents(
      dollarsToCents(product!.price),
      discount,
      dollarsToCents(product!.purchaseCost),
    ),
  }));
  const shippingAddress = {
    name: contactName,
    line1: addressLine1,
    line2: addressLine2,
    city,
    state,
    postalCode,
    country: "US",
    phone: contactPhone,
  };

  const { data: intent, error: intentError } = await supabase
    .from("checkout_intents")
    .insert({
      status: "turn14_quoted",
      payment_provider: "helcim",
      cart_items: cartSnapshot,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      billing_same_as_shipping: true,
      turn14_quote_id: String(quote.quoteId),
      turn14_quote_payload: quote.response,
      turn14_selected_shipping: quote.selectedShipping,
      amount_subtotal: subtotalCents,
      amount_total: totalCents,
      currency: "USD",
      shipping_amount: shippingCents,
      fee_amount: feeCents,
      metadata: {
        po_number: poNumber,
        discount_code: discount?.code ?? null,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (intentError || !intent) {
    console.error("Checkout intent creation failed", intentError?.message);
    return errorResponse("Checkout is temporarily unavailable.", 503);
  }

  try {
    const session = await initializeHelcimPaySession({
      amountCents: totalCents,
      paymentType: "preauth",
    });

    const { error: sessionStatusError } = await supabase
      .from("checkout_intents")
      .update({ status: "helcim_session_created" })
      .eq("id", intent.id);

    if (sessionStatusError) {
      console.error(
        "Checkout intent session status update failed",
        sessionStatusError.message,
      );
      return errorResponse("Checkout is temporarily unavailable.", 503);
    }

    return NextResponse.json({
      intentId: intent.id,
      amountCents: totalCents,
      currency: "USD",
      checkoutToken: session.checkoutToken,
      secretToken: session.secretToken,
    });
  } catch (error) {
    console.error(
      "Helcim checkout initialization failed",
      error instanceof Error ? error.message : error,
    );
    await supabase
      .from("checkout_intents")
      .update({ status: "failed" })
      .eq("id", intent.id);
    return errorResponse("Payment checkout could not be initialized.", 502);
  }
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

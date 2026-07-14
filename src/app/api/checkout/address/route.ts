import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";
import { buildStripeLineItem, dollarsToCents } from "@/lib/checkout/stripe-line-items";
import { getStripeServerClient } from "@/lib/stripe/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createTurn14Quote } from "@/lib/turn14/client";

type CheckoutAddress = {
  company: string | null;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
};

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return checkoutError(request, "Stripe is not configured.", 503);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return checkoutError(request, "Supabase is not configured.", 503);
  }

  const [formData, cartItems] = await Promise.all([
    request.formData(),
    getCartItems(),
  ]);

  if (cartItems.length === 0) {
    return checkoutError(request, "Your cart is empty.", 400);
  }

  const contactName = requiredString(formData, "contact_name");
  const contactEmail = requiredString(formData, "contact_email");
  const contactPhone = requiredString(formData, "contact_phone");

  if (!contactName || !contactEmail || !contactPhone) {
    return checkoutError(request, "Contact details are required.", 400);
  }

  const contact = {
    name: contactName,
    email: contactEmail,
    phone: contactPhone,
  };

  const shippingAddress = readAddress(formData, "shipping", contact, true);
  if (!shippingAddress) {
    return checkoutError(request, "Shipping address is required.", 400);
  }

  const billingSameAsShipping =
    stringValue(formData.get("billing_same_as_shipping")) === "true";
  const billingAddress = billingSameAsShipping
    ? shippingAddress
    : readAddress(formData, "billing", contact, true);

  if (!billingAddress) {
    return checkoutError(request, "Billing address is required.", 400);
  }

  const acknowledgeCompliance =
    stringValue(formData.get("acknowledge_compliance")) === "true";
  if (!acknowledgeCompliance) {
    return checkoutError(request, "Required order acknowledgements are missing.", 400);
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

  const cartSnapshot = cartItems.map((item) => {
    const product = productById.get(item.productId);
    return {
      product_id: item.productId,
      turn14_id: product?.turn14Id ?? null,
      part_number: product?.partNumber ?? null,
      name: product?.name ?? null,
      quantity: item.quantity,
      unit_amount: product ? dollarsToCents(product.price) : null,
      currency: "usd",
    };
  });
  const intentId = randomUUID();
  const poNumber = `MM-${intentId.slice(0, 8).toUpperCase()}`;

  const { data: intent, error: intentError } = await supabase
    .from("checkout_intents")
    .insert({
      id: intentId,
      status: "address_collected",
      cart_items: cartSnapshot,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      billing_same_as_shipping: billingSameAsShipping,
      acknowledge_prop_65: true,
      acknowledge_epa: true,
      acknowledge_carb: true,
      metadata: {
        po_number: poNumber,
        cart_product_ids: cartItems.map((item) => item.productId).join(","),
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (intentError || !intent) {
    return checkoutError(
      request,
      "Could not save checkout details.",
      500,
    );
  }

  let turn14Quote;
  try {
    turn14Quote = await createTurn14Quote({
      poNumber,
      items: cartItems.map((item) => {
        const product = productById.get(item.productId);
        if (!product) {
          throw new Error(`Missing product for cart item ${item.productId}.`);
        }
        return {
          turn14Id: product.turn14Id,
          quantity: item.quantity,
        };
      }),
      recipient: shippingAddress,
    });
  } catch (error) {
    await supabase
      .from("checkout_intents")
      .update({
        status: "failed",
        metadata: {
          po_number: poNumber,
          cart_product_ids: cartItems.map((item) => item.productId).join(","),
          turn14_quote_error:
            error instanceof Error ? error.message : "Unknown Turn14 quote error.",
        },
      })
      .eq("id", intent.id);
    return checkoutError(
      request,
      error instanceof Error ? error.message : "Could not create Turn14 quote.",
      502,
    );
  }

  const shippingAmount = dollarsToCents(turn14Quote.shippingTotal);
  const feeAmount = dollarsToCents(turn14Quote.feeTotal);
  const checkoutLineItems = [
    ...lineItems,
    ...buildChargeLineItems({ shippingAmount, feeAmount }),
  ];

  const origin = siteOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: intent.id,
    customer_email: contact.email,
    line_items: checkoutLineItems,
    metadata: {
      checkout_intent_id: intent.id,
      turn14_quote_id: String(turn14Quote.quoteId),
      po_number: poNumber,
      cart_product_ids: cartItems.map((item) => item.productId).join(","),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/address?checkout=cancelled`,
    billing_address_collection: "auto",
    phone_number_collection: {
      enabled: true,
    },
  });

  if (!session.url) {
    return checkoutError(request, "Stripe did not return a checkout URL.", 502);
  }

  const { error: updateError } = await supabase
    .from("checkout_intents")
    .update({
      status: "stripe_session_created",
      stripe_checkout_session_id: session.id,
      turn14_quote_id: String(turn14Quote.quoteId),
      turn14_quote_payload: turn14Quote.response,
      turn14_selected_shipping: turn14Quote.selectedShipping,
      shipping_amount: shippingAmount,
      fee_amount: feeAmount,
    })
    .eq("id", intent.id);

  if (updateError) {
    return checkoutError(
      request,
      "Could not finalize checkout details.",
      500,
    );
  }

  return NextResponse.redirect(session.url, 303);
}

function buildChargeLineItems({
  shippingAmount,
  feeAmount,
}: {
  shippingAmount: number;
  feeAmount: number;
}) {
  const lineItems = [];
  if (shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: shippingAmount,
        product_data: {
          name: "Shipping",
          metadata: {
            charge_type: "shipping",
          },
        },
      },
    });
  }
  if (feeAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: feeAmount,
        product_data: {
          name: "Supplier fees",
          metadata: {
            charge_type: "turn14_fees",
          },
        },
      },
    });
  }
  return lineItems;
}

function readAddress(
  formData: FormData,
  prefix: "shipping" | "billing",
  contact: { name: string; email: string; phone: string },
  required: boolean,
): CheckoutAddress | null {
  const address = {
    company: optionalString(formData, `${prefix}_company`),
    name: contact.name,
    line1: requiredString(formData, `${prefix}_address`),
    line2: optionalString(formData, `${prefix}_address_2`),
    city: requiredString(formData, `${prefix}_city`),
    state: requiredString(formData, `${prefix}_state`)?.toUpperCase() ?? null,
    country:
      requiredString(formData, `${prefix}_country`)?.toUpperCase() ?? null,
    postal_code: requiredString(formData, `${prefix}_zip`),
    phone: contact.phone,
    email: contact.email,
  };

  if (
    required &&
    (!address.line1 ||
      !address.city ||
      !address.state ||
      !address.country ||
      !address.postal_code)
  ) {
    return null;
  }

  return address.line1 &&
    address.city &&
    address.state &&
    address.country &&
    address.postal_code
    ? {
        company: address.company,
        name: address.name,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        country: address.country,
        postal_code: address.postal_code,
        phone: address.phone,
        email: address.email,
      }
    : null;
}

function requiredString(formData: FormData, name: string) {
  const value = stringValue(formData.get(name))?.trim();
  return value && value.length > 0 ? value : null;
}

function optionalString(formData: FormData, name: string) {
  return stringValue(formData.get(name))?.trim() || null;
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}

function checkoutError(request: NextRequest, message: string, status: number) {
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ error: message }, { status });
  }

  const url = new URL("/checkout/address", siteOrigin(request));
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

function siteOrigin(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

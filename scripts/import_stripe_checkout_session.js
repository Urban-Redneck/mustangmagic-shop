#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

loadDotenv(path.resolve(__dirname, "..", ".env"));
loadDotenv(path.resolve(__dirname, "..", ".env.local"));

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node scripts/import_stripe_checkout_session.js <checkout_session_id>");
  process.exit(2);
}

const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_Sec_key;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecret || !supabaseUrl || !supabaseKey) {
  console.error("Missing Stripe or Supabase server environment variables.");
  process.exit(2);
}

const stripe = new Stripe(stripeSecret);
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "customer"],
  });
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price.product"],
    limit: 100,
  });

  const isPaid =
    session.payment_status === "paid" ||
    (typeof session.payment_intent === "object" &&
      session.payment_intent?.status === "succeeded");

  if (!isPaid) {
    throw new Error(`Checkout session is not paid: ${session.payment_status}`);
  }

  const orderPayload = {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: idValue(session.payment_intent),
    stripe_customer_id: idValue(session.customer),
    status: "paid",
    payment_status: session.payment_status,
    fulfillment_status: "pending",
    amount_subtotal: session.amount_subtotal,
    amount_total: requiredAmount(session.amount_total),
    currency: session.currency || "usd",
    customer_email: session.customer_details?.email || null,
    customer_name: session.customer_details?.name || null,
    customer_phone: session.customer_details?.phone || null,
    billing_address: session.customer_details?.address || null,
    shipping_address:
      session.shipping_details?.address ||
      session.customer_details?.address ||
      null,
    metadata: session.metadata || {},
    raw_stripe_session: redactStripePayload(session),
    paid_at: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };

  const { data: order, error: orderError } = await supabase
    .from("store_orders")
    .upsert(orderPayload, { onConflict: "stripe_checkout_session_id" })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(`Failed to upsert order: ${orderError?.message || "missing row"}`);
  }

  const { error: deleteError } = await supabase
    .from("store_order_items")
    .delete()
    .eq("order_id", order.id);

  if (deleteError) {
    throw new Error(`Failed to replace order items: ${deleteError.message}`);
  }

  const items = lineItems.data.map((item) => {
    const product = stripeProduct(item.price?.product);
    const metadata = product?.metadata || {};
    const quantity = item.quantity || 1;
    const amountTotal = requiredAmount(item.amount_total);
    return {
      order_id: order.id,
      product_id: metadata.product_id || null,
      turn14_id: metadata.turn14_id || null,
      part_number: metadata.part_number || null,
      product_name: item.description || product?.name || "Store item",
      quantity,
      unit_amount: Math.round(amountTotal / Math.max(quantity, 1)),
      amount_total: amountTotal,
      currency: item.currency || session.currency || "usd",
      stripe_line_item_id: item.id,
      stripe_product_id: product?.id || null,
      raw_stripe_line_item: redactStripePayload(item),
    };
  });

  if (items.length > 0) {
    const { error: itemError } = await supabase
      .from("store_order_items")
      .insert(items);
    if (itemError) {
      throw new Error(`Failed to insert order items: ${itemError.message}`);
    }
  }

  console.log(JSON.stringify({ order_id: order.id, items: items.length }, null, 2));
}

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.replace(/^export\s+/, "").trim();
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function idValue(value) {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id || null;
}

function stripeProduct(value) {
  if (!value || typeof value === "string" || value.deleted) {
    return null;
  }
  return value;
}

function requiredAmount(value) {
  if (typeof value !== "number") {
    throw new Error("Stripe object was missing amount_total.");
  }
  return value;
}

function redactStripePayload(value) {
  const sensitiveKeys = new Set([
    "client_secret",
    "payment_method",
    "source",
    "fingerprint",
  ]);

  return JSON.parse(
    JSON.stringify(value, (key, nestedValue) =>
      sensitiveKeys.has(key) && nestedValue ? "[redacted]" : nestedValue,
    ),
  );
}

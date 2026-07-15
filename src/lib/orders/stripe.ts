import Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createTurn14OrderFromQuote,
  type SelectedTurn14Shipping,
} from "@/lib/turn14/client";

export async function recordPaidCheckoutSession(
  stripe: Stripe,
  sessionId: string,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge", "customer"],
  });
  const sessionWithShipping = session as Stripe.Checkout.Session & {
    shipping_details?: { address?: Stripe.Address | null } | null;
  };
  const checkoutIntent = await getCheckoutIntent(
    supabase,
    session.metadata?.checkout_intent_id,
  );
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price.product"],
    limit: 100,
  });

  if (session.mode !== "payment") {
    throw new Error(`Unsupported Stripe Checkout mode: ${session.mode}`);
  }

  const isPaid =
    session.payment_status === "paid" ||
    paymentIntentStatus(session.payment_intent) === "succeeded";

  if (!isPaid) {
    throw new Error(
      `Checkout session ${session.id} is not paid: ${session.payment_status}`,
    );
  }

  const refund = paymentRefundStatus(session.payment_intent);

  const orderPayload = {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: idValue(session.payment_intent),
    stripe_customer_id: idValue(session.customer),
    status: refund.refunded ? "refunded" : "paid",
    payment_status: refund.refunded ? "refunded" : session.payment_status,
    fulfillment_status: refund.refunded ? "cancelled" : "pending",
    turn14_quote_id: checkoutIntent?.turn14_quote_id ?? null,
    turn14_order_id: checkoutIntent?.turn14_order_id ?? null,
    amount_subtotal: session.amount_subtotal,
    amount_total: requiredAmount(session.amount_total),
    currency: session.currency ?? "usd",
    customer_email:
      checkoutIntent?.contact_email ?? session.customer_details?.email ?? null,
    customer_name:
      checkoutIntent?.contact_name ?? session.customer_details?.name ?? null,
    customer_phone:
      checkoutIntent?.contact_phone ?? session.customer_details?.phone ?? null,
    billing_address:
      checkoutIntent?.billing_address ?? session.customer_details?.address ?? null,
    shipping_address:
      checkoutIntent?.shipping_address ??
      sessionWithShipping.shipping_details?.address ??
      session.customer_details?.address ??
      null,
    metadata: checkoutIntent
      ? {
          ...checkoutIntent.metadata,
          ...(session.metadata ?? {}),
          checkout_intent_id: checkoutIntent.id,
          ...(refund.refunded
            ? {
                refund_status: "refunded",
                refunded_amount: refund.amountRefunded,
              }
            : {}),
        }
      : session.metadata ?? {},
    raw_stripe_session: redactStripePayload(
      session as unknown as Record<string, unknown>,
    ),
    paid_at: new Date((session.created ?? unixNow()) * 1000).toISOString(),
  };

  const { data: order, error: orderError } = await supabase
    .from("store_orders")
    .upsert(orderPayload, {
      onConflict: "stripe_checkout_session_id",
    })
    .select("id")
    .single<{ id: string }>();

  if (orderError || !order) {
    throw new Error(
      `Failed to upsert store order: ${orderError?.message ?? "missing row"}`,
    );
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
    const metadata = product?.metadata ?? {};
    const quantity = item.quantity ?? 1;
    const amountTotal = requiredAmount(item.amount_total);

    return {
      order_id: order.id,
      product_id: metadata.product_id || null,
      turn14_id: metadata.turn14_id || null,
      part_number: metadata.part_number || null,
      product_name: item.description ?? product?.name ?? "Store item",
      quantity,
      unit_amount: Math.round(amountTotal / Math.max(quantity, 1)),
      amount_total: amountTotal,
      currency: item.currency ?? session.currency ?? "usd",
      stripe_line_item_id: item.id,
      stripe_product_id: product?.id ?? null,
      raw_stripe_line_item: redactStripePayload(
        item as unknown as Record<string, unknown>,
      ),
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

  if (checkoutIntent) {
    const { error: intentError } = await supabase
      .from("checkout_intents")
      .update({
        status: refund.refunded ? "refunded" : "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: idValue(session.payment_intent),
      })
      .eq("id", checkoutIntent.id);

    if (intentError) {
      throw new Error(
        `Failed to mark checkout intent paid: ${intentError.message}`,
      );
    }

    if (!refund.refunded) {
      await submitTurn14OrderIfReady({
        supabase,
        checkoutIntent,
        storeOrderId: order.id,
        stripeSessionId: session.id,
      });
    }
  }

  await sendAndRecordOrderConfirmation({
    supabase,
    orderId: order.id,
    orderPayload,
    items,
  });
  await upsertMarketingContactIfConsented({
    supabase,
    orderId: order.id,
    orderPayload,
  });

  return order.id;
}

export async function recordStripeWebhookEvent(event: Stripe.Event) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        api_version: event.api_version ?? null,
        livemode: event.livemode,
        payload: redactStripePayload(event as unknown as Record<string, unknown>),
      },
      {
        onConflict: "stripe_event_id",
      },
    )
    .select("id, processed_at")
    .single<{ id: string; processed_at: string | null }>();

  if (error || !data) {
    throw new Error(
      `Failed to record Stripe webhook event: ${error?.message ?? "missing row"}`,
    );
  }

  return data;
}

export async function markStripeWebhookEventProcessed(
  eventId: string,
  processingError: string | null = null,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError,
    })
    .eq("stripe_event_id", eventId);

  if (error) {
    throw new Error(`Failed to mark webhook processed: ${error.message}`);
  }
}

function idValue(value: string | { id?: string } | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

type CheckoutIntentRow = {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  billing_address: Record<string, unknown>;
  shipping_address: Record<string, unknown>;
  metadata: Record<string, unknown>;
  turn14_quote_id: string | null;
  turn14_order_id: string | null;
  turn14_selected_shipping: SelectedTurn14Shipping[] | null;
  acknowledge_prop_65: boolean;
  acknowledge_epa: boolean;
  acknowledge_carb: boolean;
};

async function getCheckoutIntent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string | undefined,
) {
  if (!supabase || !id || !isUuid(id)) {
    return null;
  }

  const { data, error } = await supabase
    .from("checkout_intents")
    .select(
      [
        "id",
        "contact_name",
        "contact_email",
        "contact_phone",
        "billing_address",
        "shipping_address",
        "metadata",
        "turn14_quote_id",
        "turn14_order_id",
        "turn14_selected_shipping",
        "acknowledge_prop_65",
        "acknowledge_epa",
        "acknowledge_carb",
      ].join(", "),
    )
    .eq("id", id)
    .maybeSingle<CheckoutIntentRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

async function submitTurn14OrderIfReady({
  supabase,
  checkoutIntent,
  storeOrderId,
  stripeSessionId,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>;
  checkoutIntent: CheckoutIntentRow;
  storeOrderId: string;
  stripeSessionId: string;
}) {
  if (checkoutIntent.turn14_order_id) {
    return;
  }

  const quoteId = Number(checkoutIntent.turn14_quote_id);
  const selectedShipping = checkoutIntent.turn14_selected_shipping;
  const poNumber = stringValue(checkoutIntent.metadata.po_number);
  if (
    !Number.isFinite(quoteId) ||
    !poNumber ||
    !Array.isArray(selectedShipping) ||
    selectedShipping.length === 0
  ) {
    await markTurn14OrderFailure({
      supabase,
      checkoutIntentId: checkoutIntent.id,
      storeOrderId,
      message: "Checkout intent is missing Turn14 quote/order details.",
    });
    return;
  }

  try {
    const order = await createTurn14OrderFromQuote({
      quoteId,
      poNumber,
      selectedShipping,
      phoneNumber: checkoutIntent.contact_phone,
      acknowledgeProp65: checkoutIntent.acknowledge_prop_65,
      acknowledgeEpa: checkoutIntent.acknowledge_epa,
      acknowledgeCarb: checkoutIntent.acknowledge_carb,
    });
    const turn14OrderId = order.orderId ? String(order.orderId) : null;
    const submittedAt = new Date().toISOString();

    await supabase
      .from("checkout_intents")
      .update({
        status: "turn14_order_submitted",
        turn14_order_id: turn14OrderId,
        turn14_order_payload: order.response,
        turn14_order_error: null,
        turn14_order_submitted_at: submittedAt,
      })
      .eq("id", checkoutIntent.id);

    await supabase
      .from("store_orders")
      .update({
        fulfillment_status: "ordered",
        turn14_order_id: turn14OrderId,
        turn14_quote_id: checkoutIntent.turn14_quote_id,
        metadata: {
          ...checkoutIntent.metadata,
          checkout_intent_id: checkoutIntent.id,
          stripe_checkout_session_id: stripeSessionId,
          turn14_quote_id: checkoutIntent.turn14_quote_id,
          turn14_order_id: turn14OrderId,
          turn14_order_submitted_at: submittedAt,
        },
      })
      .eq("id", storeOrderId);
  } catch (error) {
    await markTurn14OrderFailure({
      supabase,
      checkoutIntentId: checkoutIntent.id,
      storeOrderId,
      message: error instanceof Error ? error.message : "Unknown Turn14 order error.",
    });
  }
}

async function markTurn14OrderFailure({
  supabase,
  checkoutIntentId,
  storeOrderId,
  message,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>;
  checkoutIntentId: string;
  storeOrderId: string;
  message: string;
}) {
  await supabase
    .from("checkout_intents")
    .update({
      status: "turn14_order_failed",
      turn14_order_error: message,
    })
    .eq("id", checkoutIntentId);

  await supabase
    .from("store_orders")
    .update({
      fulfillment_status: "reviewing",
      metadata: {
        checkout_intent_id: checkoutIntentId,
        turn14_order_error: message,
      },
    })
    .eq("id", storeOrderId);
}

async function sendAndRecordOrderConfirmation({
  supabase,
  orderId,
  orderPayload,
  items,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>;
  orderId: string;
  orderPayload: {
    stripe_checkout_session_id: string;
    turn14_order_id: string | null;
    fulfillment_status: string;
    amount_total: number;
    currency: string;
    customer_email: string | null;
    customer_name: string | null;
    shipping_address: Record<string, unknown> | Stripe.Address | null;
    metadata: Record<string, unknown>;
  };
  items: Array<{
    part_number: string | null;
    product_name: string;
    quantity: number;
    amount_total: number;
    currency: string;
  }>;
}) {
  const { data: orderRecord } = await supabase
    .from("store_orders")
    .select("metadata, turn14_order_id, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle<{
      metadata: Record<string, unknown> | null;
      turn14_order_id: string | null;
      fulfillment_status: string;
    }>();

  const metadata = orderRecord?.metadata ?? orderPayload.metadata;
  if (objectValue(metadata.order_confirmation_email)?.status === "sent") {
    return;
  }

  const result = await sendOrderConfirmationEmail({
    to: orderPayload.customer_email,
    customerName: orderPayload.customer_name,
    orderNumber:
      stringValue(metadata.po_number) ??
      `MM-${orderPayload.stripe_checkout_session_id.slice(-8).toUpperCase()}`,
    stripeSessionId: orderPayload.stripe_checkout_session_id,
    turn14OrderId: orderRecord?.turn14_order_id ?? orderPayload.turn14_order_id,
    fulfillmentStatus:
      orderRecord?.fulfillment_status ?? orderPayload.fulfillment_status,
    amountTotal: orderPayload.amount_total,
    currency: orderPayload.currency,
    shippingAddress: orderPayload.shipping_address,
    items: items.map((item) => ({
      partNumber: item.part_number,
      productName: item.product_name,
      quantity: item.quantity,
      amountTotal: item.amount_total,
      currency: item.currency,
    })),
  });

  await supabase
    .from("store_orders")
    .update({
      metadata: {
        ...metadata,
        order_confirmation_email: result,
      },
    })
    .eq("id", orderId);
}

async function upsertMarketingContactIfConsented({
  supabase,
  orderId,
  orderPayload,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>;
  orderId: string;
  orderPayload: {
    stripe_customer_id: string | null;
    customer_email: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    stripe_checkout_session_id: string;
    metadata: Record<string, unknown>;
  };
}) {
  if (orderPayload.metadata.marketing_opt_in !== true) {
    return;
  }

  const email = orderPayload.customer_email?.trim().toLowerCase();
  if (!email) {
    return;
  }

  await supabase.from("marketing_contacts").upsert(
    {
      email,
      name: orderPayload.customer_name,
      phone: orderPayload.customer_phone,
      source: stringValue(orderPayload.metadata.marketing_opt_in_source) ?? "checkout",
      consent_status: "subscribed",
      consented_at: new Date().toISOString(),
      unsubscribed_at: null,
      last_order_id: orderId,
      stripe_customer_id: orderPayload.stripe_customer_id,
      metadata: {
        last_stripe_checkout_session_id: orderPayload.stripe_checkout_session_id,
      },
    },
    {
      onConflict: "email",
    },
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function paymentIntentStatus(value: string | Stripe.PaymentIntent | null) {
  return value && typeof value !== "string" ? value.status : null;
}

function paymentRefundStatus(value: string | Stripe.PaymentIntent | null) {
  if (!value || typeof value === "string") {
    return { refunded: false, amountRefunded: 0 };
  }

  const latestCharge = value.latest_charge;
  if (!latestCharge || typeof latestCharge === "string") {
    return { refunded: false, amountRefunded: 0 };
  }

  const amountRefunded = latestCharge.amount_refunded ?? 0;
  return {
    refunded: latestCharge.refunded === true || amountRefunded > 0,
    amountRefunded,
  };
}

function stripeProduct(
  value: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
) {
  if (!value || typeof value === "string" || value.deleted) {
    return null;
  }

  return value;
}

function requiredAmount(value: number | null) {
  if (typeof value !== "number") {
    throw new Error("Stripe session was missing amount_total.");
  }

  return value;
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function redactStripePayload<T>(value: T): T {
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
  ) as T;
}

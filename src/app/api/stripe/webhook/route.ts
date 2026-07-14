import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import {
  markStripeWebhookEventProcessed,
  recordPaidCheckoutSession,
  recordStripeWebhookEvent,
} from "@/lib/orders/stripe";
import { getStripeServerClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Invalid Stripe webhook signature: ${error.message}`
            : "Invalid Stripe webhook signature.",
      },
      { status: 400 },
    );
  }

  const storedEvent = await recordStripeWebhookEvent(event);
  if (storedEvent.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      await recordPaidCheckoutSession(stripe, session.id);
    }

    await markStripeWebhookEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error.";
    await markStripeWebhookEventProcessed(event.id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getStripeWebhookSecret() {
  const candidates = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_Webhook_Secret,
    process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
  ].filter(Boolean);

  return candidates.find((secret) => secret?.startsWith("whsec_")) ?? null;
}

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyHelcimWebhook } from "@/lib/helcim/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("webhook-signature");
  const timestampHeader = request.headers.get("webhook-timestamp");
  const webhookIdHeader = request.headers.get("webhook-id");

  if (
    !verifyHelcimWebhook({
      rawBody,
      signatureHeader,
      timestampHeader,
      webhookIdHeader,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase || !webhookIdHeader) {
    return NextResponse.json({ error: "Webhook storage is unavailable." }, { status: 503 });
  }

  const payload = (JSON.parse(rawBody) as Record<string, unknown>) ?? {};
  const eventType = stringValue(payload.type) ?? "unknown";
  const transactionId = stringValue(payload.id);
  const { error } = await supabase.from("payment_events").insert({
    provider: "helcim",
    provider_event_id: webhookIdHeader,
    event_type: eventType,
    payload: {
      type: eventType,
      id: transactionId,
      data: objectValue(payload.data),
    },
  });

  if (error) {
    if (isDuplicate(error.message)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("Helcim webhook storage failed", error.message);
    return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function isDuplicate(message: string) {
  return message.includes("payment_events_provider_event_id_unique") || message.includes("duplicate key");
}

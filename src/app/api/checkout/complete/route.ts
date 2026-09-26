import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyHelcimPayResponse } from "@/lib/helcim/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Checkout is unavailable." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    intentId?: unknown;
    checkoutToken?: unknown;
    secretToken?: unknown;
    response?: unknown;
  } | null;
  const intentId = stringValue(body?.intentId);
  const checkoutToken = stringValue(body?.checkoutToken);
  const secretToken = stringValue(body?.secretToken);
  const eventMessage = parseObject(body?.response);
  const nestedResponse = objectValue(eventMessage?.data);
  const response =
    nestedResponse && objectValue(nestedResponse.data) && stringValue(nestedResponse.hash)
      ? nestedResponse
      : eventMessage;
  const rawData = objectValue(response?.data);
  const hash = stringValue(response?.hash);

  if (!intentId || !checkoutToken || !secretToken || !rawData || !hash) {
    return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  }

  if (!verifyHelcimPayResponse({ rawData, hash, secretToken })) {
    return NextResponse.json({ error: "Payment validation failed." }, { status: 400 });
  }

  const { data: intent, error } = await supabase
    .from("checkout_intents")
    .select("id, status, payment_provider, amount_total, currency")
    .eq("id", intentId)
    .eq("payment_provider", "helcim")
    .maybeSingle<{
      id: string;
      status: string;
      payment_provider: string;
      amount_total: number;
      currency: string;
    }>();

  if (error || !intent) {
    return NextResponse.json({ error: "Checkout intent was not found." }, { status: 404 });
  }

  if (intent.status === "helcim_authorized") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }
  if (intent.status !== "helcim_session_created") {
    return NextResponse.json({ error: "Checkout intent is no longer payable." }, { status: 409 });
  }

  const transactionId = stringValue(rawData.transactionId);
  const transactionStatus = stringValue(rawData.status);
  const transactionCurrency = stringValue(rawData.currency)?.toUpperCase();
  const transactionAmount = Number(rawData.amount);
  const transactionAmountCents = Number.isFinite(transactionAmount)
    ? Math.round(transactionAmount * 100)
    : null;
  if (
    !transactionId ||
    transactionStatus?.toUpperCase() !== "APPROVED" ||
    transactionCurrency !== intent.currency ||
    transactionAmountCents === null ||
    transactionAmountCents !== intent.amount_total
  ) {
    return NextResponse.json({ error: "Helcim did not approve this payment." }, { status: 402 });
  }

  const { error: updateError } = await supabase
    .from("checkout_intents")
    .update({
      status: "helcim_authorized",
      helcim_transaction_id: transactionId,
      helcim_payment_status: transactionStatus,
      helcim_card_brand: stringValue(rawData.cardType),
      helcim_card_last_four: lastFour(rawData.cardNumber),
      helcim_authorized_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .eq("status", "helcim_session_created");

  if (updateError) {
    console.error("Helcim payment confirmation update failed", updateError.message);
    return NextResponse.json({ error: "Payment confirmation could not be recorded." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseObject(value: unknown) {
  if (typeof value !== "string") {
    return objectValue(value);
  }

  try {
    return objectValue(JSON.parse(value));
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function lastFour(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}

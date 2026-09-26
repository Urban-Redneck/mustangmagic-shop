import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTurn14OrderFromQuote,
  type SelectedTurn14Shipping,
} from "@/lib/turn14/client";

type FulfillmentResult = {
  orderId: number;
  response: Record<string, unknown>;
};

export async function submitAuthorizedCheckoutToTurn14(
  supabase: SupabaseClient,
  intentId: string,
): Promise<FulfillmentResult> {
  const { data: intent, error } = await supabase
    .from("checkout_intents")
    .select(
      "id, status, turn14_quote_id, turn14_order_id, turn14_selected_shipping, metadata, contact_phone, acknowledge_prop_65, acknowledge_epa, acknowledge_carb",
    )
    .eq("id", intentId)
    .maybeSingle();

  if (error || !intent) {
    throw new Error(error?.message ?? "Checkout intent was not found.");
  }

  if (intent.turn14_order_id) {
    return {
      orderId: Number(intent.turn14_order_id),
      response: {},
    };
  }

  if (intent.status !== "helcim_authorized") {
    throw new Error(`Checkout intent is not authorized: ${intent.status}`);
  }

  const quoteId = Number(intent.turn14_quote_id);
  const selectedShipping = selectedShippingValue(intent.turn14_selected_shipping);
  const poNumber = stringValue(intent.metadata?.po_number);
  const phoneNumber = stringValue(intent.contact_phone);

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error("Checkout intent is missing a valid Turn14 quote id.");
  }
  if (!poNumber || !phoneNumber || selectedShipping.length === 0) {
    throw new Error("Checkout intent is missing Turn14 order details.");
  }

  const result = await createTurn14OrderFromQuote({
    quoteId,
    poNumber,
    selectedShipping,
    phoneNumber,
    acknowledgeProp65: intent.acknowledge_prop_65 === true,
    acknowledgeEpa: intent.acknowledge_epa === true,
    acknowledgeCarb: intent.acknowledge_carb === true,
  });

  if (result.orderId === null) {
    throw new Error("Turn14 order response did not include an order id.");
  }

  const { error: updateError } = await supabase
    .from("checkout_intents")
    .update({
      status: "turn14_order_submitted",
      turn14_order_id: String(result.orderId),
      turn14_order_payload: result.response,
      turn14_order_submitted_at: new Date().toISOString(),
      turn14_order_error: null,
    })
    .eq("id", intentId)
    .eq("status", "helcim_authorized");

  if (updateError) {
    throw new Error(`Turn14 order status update failed: ${updateError.message}`);
  }

  return { orderId: result.orderId, response: result.response };
}

function selectedShippingValue(value: unknown): SelectedTurn14Shipping[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SelectedTurn14Shipping => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const record = item as Record<string, unknown>;
    return Number.isInteger(record.shipping_quote_id) &&
      Number.isInteger(record.shipping_code) &&
      typeof record.location === "string" &&
      typeof record.cost === "number";
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

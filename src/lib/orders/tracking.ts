import { sendTrackingNotificationEmail } from "@/lib/email/tracking-notification";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTurn14PackageDetails,
  type Turn14TrackingPackageDetail,
} from "@/lib/turn14/client";

type SupabaseServerClient = NonNullable<ReturnType<typeof getSupabaseServerClient>>;

type TrackingSyncResult = {
  status: "succeeded" | "partial" | "failed";
  range: {
    startDate: string;
    endDate: string;
  };
  packagesSeen: number;
  packagesUpserted: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  unmatchedPackages: number;
  errors: string[];
};

type StoreOrderRow = {
  id: string;
  turn14_order_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  fulfillment_status: string;
  metadata: Record<string, unknown> | null;
};

type StoreOrderItemRow = {
  turn14_id: string | null;
  quantity: number;
};

type ShipmentRow = {
  id: string;
  order_id: string | null;
  tracking_number: string;
  tracking_email_status: string;
  tracking_email_result: Record<string, unknown> | null;
};

export async function syncTurn14Tracking({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<TrackingSyncResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const range = normalizeTrackingDateRange({ startDate, endDate });
  const result: TrackingSyncResult = {
    status: "succeeded",
    range,
    packagesSeen: 0,
    packagesUpserted: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    unmatchedPackages: 0,
    errors: [],
  };

  let packages: Turn14TrackingPackageDetail[];
  try {
    packages = await getTurn14PackageDetails(range);
  } catch (error) {
    return {
      ...result,
      status: "failed",
      errors: [error instanceof Error ? error.message : "Unknown Turn14 tracking error."],
    };
  }

  result.packagesSeen = packages.length;

  for (const packageDetail of packages) {
    try {
      const order = await findMatchingOrder(supabase, packageDetail);
      if (!order) {
        result.unmatchedPackages += 1;
      }

      const shipment = await upsertShipment({
        supabase,
        packageDetail,
        orderId: order?.id ?? null,
      });
      result.packagesUpserted += 1;

      if (order) {
        const emailResult = await maybeSendTrackingEmail({
          supabase,
          order,
          shipment,
          packageDetail,
        });
        if (emailResult === "sent") {
          result.emailsSent += 1;
        } else if (emailResult === "failed") {
          result.emailsFailed += 1;
        } else {
          result.emailsSkipped += 1;
        }

        await updateFulfillmentStatus(supabase, order.id);
      }
    } catch (error) {
      result.errors.push(
        `${packageDetail.tracking_number}: ${
          error instanceof Error ? error.message : "Unknown tracking sync error."
        }`,
      );
    }
  }

  result.status = result.errors.length > 0 ? "partial" : "succeeded";
  return result;
}

function normalizeTrackingDateRange({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const end = endDate ? parseDateOnly(endDate) : new Date();
  const start = startDate ? parseDateOnly(startDate) : daysBefore(end, 2);
  const maxStart = daysBefore(end, 3);
  const boundedStart = start < maxStart ? maxStart : start;

  return {
    startDate: dateOnly(boundedStart),
    endDate: dateOnly(end),
  };
}

async function findMatchingOrder(
  supabase: SupabaseServerClient,
  packageDetail: Turn14TrackingPackageDetail,
) {
  const references = trackingReferences(packageDetail);

  for (const turn14OrderId of references.turn14OrderIds) {
    const order = await maybeOrder(
      supabase
        .from("store_orders")
        .select("id, turn14_order_id, customer_email, customer_name, fulfillment_status, metadata")
        .eq("turn14_order_id", turn14OrderId)
        .maybeSingle<StoreOrderRow>(),
    );
    if (order) {
      return order;
    }
  }

  for (const websiteOrderNumber of references.websiteOrderNumbers) {
    const order = await maybeOrder(
      supabase
        .from("store_orders")
        .select("id, turn14_order_id, customer_email, customer_name, fulfillment_status, metadata")
        .filter("metadata->>turn14_order_id", "eq", websiteOrderNumber)
        .maybeSingle<StoreOrderRow>(),
    );
    if (order) {
      return order;
    }
  }

  for (const poNumber of references.purchaseOrderNumbers) {
    const order = await maybeOrder(
      supabase
        .from("store_orders")
        .select("id, turn14_order_id, customer_email, customer_name, fulfillment_status, metadata")
        .filter("metadata->>po_number", "eq", poNumber)
        .maybeSingle<StoreOrderRow>(),
    );
    if (order) {
      return order;
    }
  }

  return null;
}

async function maybeOrder(
  query: PromiseLike<{ data: StoreOrderRow | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) {
    return null;
  }
  return data;
}

async function upsertShipment({
  supabase,
  packageDetail,
  orderId,
}: {
  supabase: SupabaseServerClient;
  packageDetail: Turn14TrackingPackageDetail;
  orderId: string | null;
}) {
  const references = trackingReferences(packageDetail);
  const { data, error } = await supabase
    .from("store_order_shipments")
    .upsert(
      {
        order_id: orderId,
        tracking_number: packageDetail.tracking_number,
        turn14_tracking_id: stringValue(packageDetail.tracking_id),
        turn14_package_detail_id: stringValue(packageDetail.id),
        turn14_order_id: first(references.turn14OrderIds),
        website_order_number: first(references.websiteOrderNumbers),
        purchase_order_number: first(references.purchaseOrderNumbers),
        invoice_id: first(references.invoiceIds),
        shipping_id: packageDetail.shipping_id,
        carrier_name: packageDetail.carrier_name,
        service: packageDetail.service,
        location: packageDetail.location,
        ship_date: packageDetail.ship_date,
        items: packageDetail.items,
        raw_turn14_package_detail: packageDetail.raw,
      },
      {
        onConflict: "tracking_number",
      },
    )
    .select("id, order_id, tracking_number, tracking_email_status, tracking_email_result")
    .single<ShipmentRow>();

  if (error || !data) {
    throw new Error(`Failed to upsert tracking shipment: ${error?.message ?? "missing row"}`);
  }

  return data;
}

async function maybeSendTrackingEmail({
  supabase,
  order,
  shipment,
  packageDetail,
}: {
  supabase: SupabaseServerClient;
  order: StoreOrderRow;
  shipment: ShipmentRow;
  packageDetail: Turn14TrackingPackageDetail;
}) {
  if (shipment.tracking_email_status === "sent") {
    return "skipped";
  }

  const orderNumber =
    stringValue(order.metadata?.po_number) ??
    order.turn14_order_id ??
    `MM-${order.id.slice(0, 8).toUpperCase()}`;
  const result = await sendTrackingNotificationEmail({
    to: order.customer_email,
    customerName: order.customer_name,
    orderNumber,
    trackingNumber: packageDetail.tracking_number,
    carrierName: packageDetail.carrier_name,
    service: packageDetail.service,
    shipDate: packageDetail.ship_date,
    items: packageDetail.items.map((item) => ({
      partNumber: stringValue(item.part_number),
      productName:
        stringValue(item.part_description) ??
        stringValue(item.product_group_part_number) ??
        stringValue(item.item_id),
      quantity: numberValue(item.quantity),
    })),
  });

  await supabase
    .from("store_order_shipments")
    .update({
      tracking_email_status: result.status,
      tracking_email_result: result,
      tracking_email_sent_at: result.status === "sent" ? result.sent_at : null,
    })
    .eq("id", shipment.id);

  return result.status;
}

async function updateFulfillmentStatus(supabase: SupabaseServerClient, orderId: string) {
  const [{ data: items }, { data: shipments }] = await Promise.all([
    supabase
      .from("store_order_items")
      .select("turn14_id, quantity")
      .eq("order_id", orderId)
      .returns<StoreOrderItemRow[]>(),
    supabase
      .from("store_order_shipments")
      .select("items")
      .eq("order_id", orderId)
      .returns<Array<{ items: Array<Record<string, unknown>> }>>(),
  ]);

  const orderedByTurn14Id = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item.turn14_id) {
      continue;
    }
    orderedByTurn14Id.set(
      item.turn14_id,
      (orderedByTurn14Id.get(item.turn14_id) ?? 0) + item.quantity,
    );
  }

  const shippedByTurn14Id = new Map<string, number>();
  for (const shipment of shipments ?? []) {
    for (const item of shipment.items ?? []) {
      const turn14Id = stringValue(item.item_id);
      if (!turn14Id) {
        continue;
      }
      shippedByTurn14Id.set(
        turn14Id,
        (shippedByTurn14Id.get(turn14Id) ?? 0) + (numberValue(item.quantity) ?? 0),
      );
    }
  }

  const hasAnyShipment = shippedByTurn14Id.size > 0;
  const allKnownItemsShipped =
    orderedByTurn14Id.size > 0 &&
    Array.from(orderedByTurn14Id.entries()).every(
      ([turn14Id, quantity]) => (shippedByTurn14Id.get(turn14Id) ?? 0) >= quantity,
    );

  if (!hasAnyShipment) {
    return;
  }

  await supabase
    .from("store_orders")
    .update({
      fulfillment_status: allKnownItemsShipped ? "fulfilled" : "partially_fulfilled",
    })
    .eq("id", orderId);
}

function trackingReferences(packageDetail: Turn14TrackingPackageDetail) {
  return {
    turn14OrderIds: uniqueStrings(
      packageDetail.items.map((item) => stringValue(item.order_id)),
    ),
    websiteOrderNumbers: uniqueStrings(
      packageDetail.items.map((item) => stringValue(item.website_order_number)),
    ),
    purchaseOrderNumbers: uniqueStrings(
      packageDetail.items.map((item) => stringValue(item.po_number)),
    ),
    invoiceIds: uniqueStrings(
      packageDetail.items.map((item) => stringValue(item.invoice_id)),
    ),
  };
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function first(values: string[]) {
  return values[0] ?? null;
}

function stringValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBefore(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

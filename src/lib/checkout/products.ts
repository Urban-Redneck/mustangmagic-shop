import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutProduct = {
  id: string;
  slug: string;
  turn14Id: string;
  partNumber: string;
  name: string;
  shortDescription: string | null;
  primaryImageUrl: string | null;
  price: number;
  inventoryStatus: string;
  canPurchase: boolean;
};

type CheckoutProductRow = {
  id: string;
  slug: string;
  turn14_id: string;
  part_number: string;
  name: string;
  short_description: string | null;
  primary_image_url: string | null;
  price: number | string | null;
  manual_price: number | string | null;
  inventory_status: string;
  can_purchase: boolean | null;
};

const PURCHASABLE_INVENTORY_STATUSES = new Set([
  "in_stock",
  "low_stock",
]);

export async function getCheckoutProductById(
  id: string,
): Promise<CheckoutProduct | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "slug",
        "turn14_id",
        "part_number",
        "name",
        "short_description",
        "primary_image_url",
        "price",
        "manual_price",
        "inventory_status",
        "can_purchase",
      ].join(", "),
    )
    .eq("id", id)
    .eq("active", true)
    .maybeSingle<CheckoutProductRow>();

  if (error || !data) {
    return null;
  }

  const price = effectivePrice(data);
  const canPurchase =
    data.can_purchase === true &&
    price !== null &&
    price > 0 &&
    PURCHASABLE_INVENTORY_STATUSES.has(data.inventory_status);

  if (price === null) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    turn14Id: data.turn14_id,
    partNumber: data.part_number,
    name: data.name,
    shortDescription: data.short_description,
    primaryImageUrl: data.primary_image_url,
    price,
    inventoryStatus: data.inventory_status,
    canPurchase,
  };
}

export async function getCheckoutProductsByIds(ids: string[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase || ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "slug",
        "turn14_id",
        "part_number",
        "name",
        "short_description",
        "primary_image_url",
        "price",
        "manual_price",
        "inventory_status",
        "can_purchase",
      ].join(", "),
    )
    .eq("active", true)
    .in("id", ids)
    .returns<CheckoutProductRow[]>();

  if (error || !data) {
    return [];
  }

  const products = data.flatMap((row) => {
    const price = effectivePrice(row);
    if (price === null) {
      return [];
    }

    const canPurchase =
      row.can_purchase === true &&
      price > 0 &&
      PURCHASABLE_INVENTORY_STATUSES.has(row.inventory_status);

    return [
      {
        id: row.id,
        slug: row.slug,
        turn14Id: row.turn14_id,
        partNumber: row.part_number,
        name: row.name,
        shortDescription: row.short_description,
        primaryImageUrl: row.primary_image_url,
        price,
        inventoryStatus: row.inventory_status,
        canPurchase,
      },
    ];
  });

  return ids.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product] : [];
  });
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function effectivePrice(row: CheckoutProductRow) {
  return toNumber(row.manual_price) ?? toNumber(row.price);
}

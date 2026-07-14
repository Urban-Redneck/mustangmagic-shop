import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type CartItem = {
  productId: string;
  quantity: number;
};

const CART_COOKIE = "mm_cart";
const MAX_CART_ITEMS = 50;
const MAX_QUANTITY = 10;

type CartPayload = {
  items: CartItem[];
  updatedAt: string;
};

export async function getCartItems() {
  const cookieStore = await cookies();
  return decodeCart(cookieStore.get(CART_COOKIE)?.value).items;
}

export async function setCartItems(items: CartItem[]) {
  const cookieStore = await cookies();
  const normalizedItems = normalizeItems(items);

  if (normalizedItems.length === 0) {
    cookieStore.delete(CART_COOKIE);
    return;
  }

  cookieStore.set(CART_COOKIE, encodeCart(normalizedItems), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function addCartItem(
  items: CartItem[],
  productId: string,
  quantity: number,
) {
  const nextItems = [...items];
  const existing = nextItems.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity);
  } else {
    nextItems.unshift({ productId, quantity: clampQuantity(quantity) });
  }

  return normalizeItems(nextItems);
}

export function updateCartItem(
  items: CartItem[],
  productId: string,
  quantity: number,
) {
  if (quantity < 1) {
    return items.filter((item) => item.productId !== productId);
  }

  return normalizeItems(
    items.map((item) =>
      item.productId === productId
        ? { productId: item.productId, quantity: clampQuantity(quantity) }
        : item,
    ),
  );
}

export function parseQuantity(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 1;
  }

  const quantity = Number(value);
  if (!Number.isInteger(quantity)) {
    return null;
  }

  return clampQuantity(quantity);
}

function encodeCart(items: CartItem[]) {
  const payload: CartPayload = {
    items,
    updatedAt: new Date().toISOString(),
  };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

function decodeCart(value: string | undefined): CartPayload {
  if (!value) {
    return emptyCart();
  }

  const [data, signature] = value.split(".");
  if (!data || !signature || !validSignature(data, signature)) {
    return emptyCart();
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return {
      items: normalizeItems(Array.isArray(parsed.items) ? parsed.items : []),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return emptyCart();
  }
}

function normalizeItems(items: unknown[]) {
  const normalized: CartItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!isCartItemLike(item) || seen.has(item.productId)) {
      continue;
    }
    seen.add(item.productId);
    normalized.push({
      productId: item.productId,
      quantity: clampQuantity(item.quantity),
    });
  }

  return normalized.slice(0, MAX_CART_ITEMS);
}

function isCartItemLike(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.productId === "string" &&
    candidate.productId.length > 0 &&
    typeof candidate.quantity === "number" &&
    Number.isFinite(candidate.quantity)
  );
}

function clampQuantity(quantity: number) {
  if (quantity < 1) {
    return 0;
  }
  return Math.min(Math.trunc(quantity), MAX_QUANTITY);
}

function sign(data: string) {
  return createHmac("sha256", signingSecret()).update(data).digest("base64url");
}

function validSignature(data: string, signature: string) {
  const expected = sign(data);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function signingSecret() {
  const secret =
    process.env.CART_SIGNING_SECRET ??
    process.env.STRIPE_SECRET_KEY ??
    process.env.STRIPE_Sec_key ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing CART_SIGNING_SECRET or another server secret.");
  }

  return secret;
}

function emptyCart(): CartPayload {
  return {
    items: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function shouldUseSecureCookie() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (siteUrl) {
    return siteUrl.startsWith("https://");
  }

  return false;
}

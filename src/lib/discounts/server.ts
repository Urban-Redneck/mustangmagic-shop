import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { minimumSellPriceCents } from "@/lib/pricing/margins";

export type AppliedDiscount = {
  code: string;
  label: string;
  percentOff: number;
};

export type DiscountSummary = AppliedDiscount & {
  amount: number;
  subtotalAfterDiscount: number;
};

const DISCOUNT_COOKIE = "mm_discount";
const DEFAULT_CODES: Record<string, number> = {
  MEMBER5: 5,
};

export async function getAppliedDiscount() {
  const cookieStore = await cookies();
  const code = decodeDiscountCode(cookieStore.get(DISCOUNT_COOKIE)?.value);
  return code ? validateDiscountCode(code) : null;
}

export async function setAppliedDiscount(code: string) {
  const discount = validateDiscountCode(code);
  const cookieStore = await cookies();

  if (!discount) {
    cookieStore.delete(DISCOUNT_COOKIE);
    return null;
  }

  cookieStore.set(DISCOUNT_COOKIE, encodeDiscountCode(discount.code), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return discount;
}

export async function clearAppliedDiscount() {
  const cookieStore = await cookies();
  cookieStore.delete(DISCOUNT_COOKIE);
}

export function validateDiscountCode(value: string | null | undefined) {
  const code = normalizeDiscountCode(value);
  if (!code) {
    return null;
  }

  const percentOff = discountCodes().get(code);
  if (!percentOff) {
    return null;
  }

  return {
    code,
    label: `${percentOff}% off`,
    percentOff,
  };
}

export function calculateDiscount(
  subtotal: number,
  discount: AppliedDiscount | null,
): DiscountSummary | null {
  if (!discount || subtotal <= 0) {
    return null;
  }

  const amount = roundMoney(subtotal * (discount.percentOff / 100));
  if (amount <= 0) {
    return null;
  }

  return {
    ...discount,
    amount,
    subtotalAfterDiscount: roundMoney(Math.max(subtotal - amount, 0)),
  };
}

export function discountedUnitAmountCents(
  unitAmountCents: number,
  discount: AppliedDiscount | null,
  purchaseCostCents: number | null = null,
) {
  const minimumUnitAmount = minimumSellPriceCents(purchaseCostCents);
  if (!discount) {
    return minimumUnitAmount === null
      ? unitAmountCents
      : Math.max(unitAmountCents, minimumUnitAmount);
  }

  const discountedUnitAmount = Math.max(
    Math.round(unitAmountCents * (1 - discount.percentOff / 100)),
    0,
  );

  return minimumUnitAmount === null
    ? discountedUnitAmount
    : Math.max(discountedUnitAmount, minimumUnitAmount);
}

function discountCodes() {
  const codes = new Map<string, number>();
  for (const [code, percent] of Object.entries(DEFAULT_CODES)) {
    codes.set(code, percent);
  }

  const configuredCodes = process.env.DISCOUNT_CODES;
  if (!configuredCodes) {
    return codes;
  }

  for (const entry of configuredCodes.split(",")) {
    const [rawCode, rawPercent] = entry.split(":");
    const code = normalizeDiscountCode(rawCode);
    const percent = Number(rawPercent);
    if (!code || !Number.isFinite(percent) || percent <= 0 || percent >= 100) {
      continue;
    }
    codes.set(code, Math.round(percent * 100) / 100);
  }

  return codes;
}

function normalizeDiscountCode(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed.slice(0, 40) : null;
}

function encodeDiscountCode(code: string) {
  const data = Buffer.from(code, "utf8").toString("base64url");
  return `${data}.${sign(data)}`;
}

function decodeDiscountCode(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [data, signature] = value.split(".");
  if (!data || !signature || !validSignature(data, signature)) {
    return null;
  }

  try {
    return Buffer.from(data, "base64url").toString("utf8");
  } catch {
    return null;
  }
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
    process.env.DISCOUNT_SIGNING_SECRET ??
    process.env.CART_SIGNING_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing DISCOUNT_SIGNING_SECRET or another server secret.");
  }

  return secret;
}

function shouldUseSecureCookie() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (siteUrl) {
    return siteUrl.startsWith("https://");
  }

  return false;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

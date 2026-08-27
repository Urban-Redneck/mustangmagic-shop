import crypto from "node:crypto";

const DEFAULT_API_BASE_URL = "https://api.helcim.com/v2";
const DEFAULT_CURRENCY = "USD";

export type HelcimPaymentType = "purchase" | "preauthorize";

export type HelcimPaySession = {
  checkoutToken: string;
  secretToken: string;
};

type HelcimConfig = {
  apiBaseUrl: string;
  apiToken: string;
  currency: string;
};

export function getHelcimConfig(): HelcimConfig | null {
  const apiToken = process.env.HELCIM_API_TOKEN;
  if (!apiToken) {
    return null;
  }

  return {
    apiBaseUrl: (process.env.HELCIM_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
      /\/$/,
      "",
    ),
    apiToken,
    currency: (process.env.HELCIM_CURRENCY ?? DEFAULT_CURRENCY).toUpperCase(),
  };
}

export async function initializeHelcimPaySession({
  amountCents,
  paymentType = "preauthorize",
  invoiceNumber,
  customerCode,
}: {
  amountCents: number;
  paymentType?: HelcimPaymentType;
  invoiceNumber?: string;
  customerCode?: string;
}): Promise<HelcimPaySession> {
  const config = requiredConfig();
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Helcim payment amount must be a positive whole number of cents.");
  }

  const body: Record<string, unknown> = {
    paymentType,
    amount: amountCents / 100,
    currency: config.currency,
    language: "en",
  };
  if (invoiceNumber) body.invoiceNumber = invoiceNumber;
  if (customerCode) body.customerCode = customerCode;

  const response = await fetch(`${config.apiBaseUrl}/helcim-pay/initialize`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-token": config.apiToken,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok || !payload) {
    throw new Error(`Helcim initialization failed: ${response.status}`);
  }

  const checkoutToken = stringValue(payload.checkoutToken);
  const secretToken = stringValue(payload.secretToken);
  if (!checkoutToken || !secretToken) {
    throw new Error("Helcim initialization did not return both checkout tokens.");
  }

  return { checkoutToken, secretToken };
}

export function verifyHelcimWebhook({
  rawBody,
  signatureHeader,
  timestampHeader,
  webhookIdHeader,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds =  fiveMinutes,
}: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  webhookIdHeader: string | null;
  nowSeconds?: number;
  maxAgeSeconds?: number;
}) {
  const verifierToken = process.env.HELCIM_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken || !signatureHeader || !timestampHeader || !webhookIdHeader) {
    return false;
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > maxAgeSeconds) {
    return false;
  }

  let secret: Buffer;
  try {
    secret = Buffer.from(verifierToken, "base64");
  } catch {
    return false;
  }
  const signedContent = `${webhookIdHeader}.${timestampHeader}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedContent)
    .digest("base64");

  return signatureHeader.split(" ").some((candidate) => {
    const [, value] = candidate.split(",", 2);
    if (!value) return false;
    const actual = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);
    return (
      actual.length === expectedBuffer.length &&
      crypto.timingSafeEqual(actual, expectedBuffer)
    );
  });
}

function requiredConfig() {
  const config = getHelcimConfig();
  if (!config) {
    throw new Error("HELCIM_API_TOKEN is not configured.");
  }
  return config;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const fiveMinutes = 5 * 60;

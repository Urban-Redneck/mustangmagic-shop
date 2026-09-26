import crypto from "node:crypto";

const DEFAULT_API_BASE_URL = "https://api.helcim.com/v2";
const DEFAULT_CURRENCY = "USD";

export type HelcimPaymentType = "purchase" | "preauth" | "verify";

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
  paymentType = "preauth",
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
    const errorMessage =
      payload && typeof payload.errors === "string" ? `: ${payload.errors}` : "";
    throw new Error(`Helcim initialization failed: ${response.status}${errorMessage}`);
  }

  const checkoutToken = stringValue(payload.checkoutToken);
  const secretToken = stringValue(payload.secretToken);
  if (!checkoutToken || !secretToken) {
    throw new Error("Helcim initialization did not return both checkout tokens.");
  }

  return { checkoutToken, secretToken };
}

export async function captureHelcimPayPreauthorization({
  legacyTransactionId,
  cardToken,
  amountCents,
  dateCreated,
  idempotencyKey,
  ipAddress,
}: {
  legacyTransactionId: string;
  cardToken: string;
  amountCents: number;
  dateCreated: string;
  idempotencyKey: string;
  ipAddress: string;
}) {
  const config = requiredConfig();
  const transaction = await findHelcimV2Preauthorization({
    legacyTransactionId,
    cardToken,
    amountCents,
    dateCreated,
  });
  if (!transaction) {
    throw new Error("Helcim V2 preauthorization transaction could not be located.");
  }

  const response = await fetch(`${config.apiBaseUrl}/payment/capture`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-token": config.apiToken,
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({
      preAuthTransactionId: transaction.transactionId,
      amount: amountCents / 100,
      ipAddress,
      ecommerce: true,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Helcim capture failed: ${response.status} ${safeError(payload)}`);
  }

  return {
    v2TransactionId: String(transaction.transactionId),
    response: objectValue(payload) ?? {},
  };
}

async function findHelcimV2Preauthorization({
  legacyTransactionId,
  cardToken,
  amountCents,
  dateCreated,
}: {
  legacyTransactionId: string;
  cardToken: string;
  amountCents: number;
  dateCreated: string;
}) {
  const config = requiredConfig();
  const date = dateCreated.slice(0, 10);
  const params = new URLSearchParams({
    cardToken,
    dateFrom: date,
    dateTo: date,
    limit: "100",
    page: "1",
  });
  const response = await fetch(`${config.apiBaseUrl}/card-transactions?${params}`, {
    headers: { accept: "application/json", "api-token": config.apiToken },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Helcim transaction lookup failed: ${response.status} ${safeError(payload)}`);
  }

  const root = objectValue(payload);
  const records = Array.isArray(payload)
    ? payload
    : arrayValue(root?.data).length > 0
      ? arrayValue(root?.data)
      : arrayValue(objectValue(root?.data)?.data);
  const legacyId = Number(legacyTransactionId);
  return records
    .map(objectValue)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .filter((record) => {
      const amount = Number(record.amount);
      const status = stringValue(record.status)?.toUpperCase();
      const type = stringValue(record.type)?.toUpperCase() ?? "";
      return (
        Number.isFinite(amount) && Math.round(amount * 100) === amountCents &&
        (type === "PREAUTH" || type === "PREAUTHORIZATION" || type === "") &&
        status === "APPROVED" &&
        stringValue(record.cardToken) === cardToken &&
        (Number(record.transactionId) !== legacyId || !Number.isFinite(legacyId))
      );
    })
    .sort((a, b) => String(b.dateCreated ?? "").localeCompare(String(a.dateCreated ?? "")))
    .map((record) => ({ transactionId: Number(record.transactionId) }))[0] ?? null;
}

export function verifyHelcimWebhook({
  rawBody,
  signatureHeader,
  timestampHeader,
  webhookIdHeader,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = fiveMinutes,
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

export function verifyHelcimPayResponse({
  rawData,
  hash,
  secretToken,
}: {
  rawData: Record<string, unknown>;
  hash: string;
  secretToken: string;
}) {
  const normalizedData = JSON.stringify(rawData);
  const expectedHash = crypto
    .createHash("sha256")
    .update(`${normalizedData}${secretToken}`)
    .digest("hex");
  const actualBuffer = Buffer.from(hash);
  const expectedBuffer = Buffer.from(expectedHash);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
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

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function safeError(value: unknown) {
  const record = objectValue(value);
  return typeof record?.errors === "string" ? record.errors : "unknown error";
}

const fiveMinutes = 5 * 60;

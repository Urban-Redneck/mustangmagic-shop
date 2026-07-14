type Turn14Address = {
  company: string | null;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
};

export type Turn14QuoteItem = {
  turn14Id: string;
  quantity: number;
};

export type SelectedTurn14Shipping = {
  location: string;
  type: string | null;
  shipping_quote_id: number;
  shipping_code: number;
  cost: number;
  days_in_transit: number | null;
  verbose_eta: string | null;
  saturday_delivery: boolean;
  signature_required: boolean;
  dropship_controller_id: number | null;
};

type Turn14Config = {
  apiBaseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  environment: "testing" | "production";
};

export type Turn14QuoteResult = {
  quoteId: number;
  response: Record<string, unknown>;
  selectedShipping: SelectedTurn14Shipping[];
  shippingTotal: number;
  feeTotal: number;
};

export type Turn14OrderResult = {
  orderId: number | null;
  response: Record<string, unknown>;
};

export function getTurn14Config(): Turn14Config | null {
  const clientId = process.env.TURN14_CLIENT_ID;
  const clientSecret = process.env.TURN14_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  const apiBaseUrl = (
    process.env.TURN14_API_BASE_URL ?? "https://api.turn14.com/v1"
  ).replace(/\/$/, "");
  const authUrl =
    process.env.TURN14_AUTH_URL ?? `${apiBaseUrl.replace(/\/v1$/, "")}/v1/token`;
  const environment =
    process.env.TURN14_ORDER_ENVIRONMENT === "testing" ||
    process.env.TURN14_ENVIRONMENT === "testing" ||
    apiBaseUrl.includes("apitest.")
      ? "testing"
      : "production";

  return {
    apiBaseUrl,
    authUrl,
    clientId,
    clientSecret,
    environment,
  };
}

export async function createTurn14Quote({
  poNumber,
  items,
  recipient,
}: {
  poNumber: string;
  items: Turn14QuoteItem[];
  recipient: Turn14Address;
}): Promise<Turn14QuoteResult> {
  const config = requiredConfig();
  const token = await getAccessToken(config);
  const response = await turn14Request(config, token, "/quote", {
    data: {
      environment: config.environment,
      po_number: poNumber,
      sales_source: 2,
      locations: [
        {
          location: "default",
          combine_in_out_stock: false,
          items: items.map((item) => ({
            item_identifier: item.turn14Id,
            item_identifier_type: "item_id",
            quantity: item.quantity,
          })),
        },
      ],
      recipient: toTurn14Recipient(recipient),
    },
  });

  const quoteId = numericPath(response, ["data", "id"]);
  if (quoteId === null) {
    throw new Error("Turn14 quote response did not include a quote id.");
  }

  const selectedShipping = selectCheapestShipping(response);
  if (selectedShipping.length === 0) {
    throw new Error("Turn14 quote did not return any selectable shipping options.");
  }

  return {
    quoteId,
    response,
    selectedShipping,
    shippingTotal: selectedShipping.reduce((sum, item) => sum + item.cost, 0),
    feeTotal: collectFees(response).reduce((sum, fee) => sum + fee, 0),
  };
}

export async function createTurn14OrderFromQuote({
  quoteId,
  poNumber,
  selectedShipping,
  phoneNumber,
  acknowledgeProp65,
  acknowledgeEpa,
  acknowledgeCarb,
}: {
  quoteId: number;
  poNumber: string;
  selectedShipping: SelectedTurn14Shipping[];
  phoneNumber: string;
  acknowledgeProp65: boolean;
  acknowledgeEpa: boolean;
  acknowledgeCarb: boolean;
}): Promise<Turn14OrderResult> {
  const config = requiredConfig();
  const token = await getAccessToken(config);
  const response = await turn14Request(config, token, "/order/from_quote", {
    data: {
      environment: config.environment,
      quote_id: quoteId,
      po_number: poNumber,
      acknowledge_prop_65: acknowledgeProp65,
      acknowledge_epa: acknowledgeEpa,
      acknowledge_carb: acknowledgeCarb,
      phone_number: phoneNumber,
      shipping: selectedShipping.map((shipping) => ({
        shipping_id: shipping.shipping_quote_id,
        saturday_delivery: shipping.saturday_delivery,
        signature_required: shipping.signature_required,
      })),
    },
  });

  return {
    orderId: numericPath(response, ["data", "id"]),
    response,
  };
}

function requiredConfig() {
  const config = getTurn14Config();
  if (!config) {
    throw new Error("Turn14 credentials are not configured.");
  }
  return config;
}

async function getAccessToken(config: Turn14Config) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const response = await fetch(config.authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; error?: string }
    | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `Turn14 token request failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return payload.access_token;
}

async function turn14Request(
  config: Turn14Config,
  token: string,
  path: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok || !payload) {
    throw new Error(
      `Turn14 ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return payload;
}

function toTurn14Recipient(address: Turn14Address) {
  return {
    company: address.company ?? undefined,
    name: address.name,
    address: address.line1,
    address_2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    country: address.country,
    zip: address.postal_code,
    email_address: address.email,
    phone_number: address.phone,
    is_shop_address: false,
  };
}

function selectCheapestShipping(
  quoteResponse: Record<string, unknown>,
): SelectedTurn14Shipping[] {
  const shipments = arrayPath(quoteResponse, ["data", "attributes", "shipment"]);
  return shipments.flatMap((shipment) => {
    const shipmentRecord = objectValue(shipment);
    if (!shipmentRecord) {
      return [];
    }
    const options = arrayValue(shipmentRecord.shipping)
      .map((option) => normalizeShippingOption(shipmentRecord, option))
      .filter((option): option is SelectedTurn14Shipping => option !== null)
      .sort((a, b) => a.cost - b.cost);
    return options[0] ? [options[0]] : [];
  });
}

function normalizeShippingOption(
  shipment: Record<string, unknown>,
  option: unknown,
) {
  const shipping = objectValue(option);
  if (!shipping) {
    return null;
  }
  const shippingQuoteId = numberValue(shipping.shipping_quote_id);
  const shippingCode = numberValue(shipping.shipping_code);
  const cost = numberValue(shipping.cost);
  if (shippingQuoteId === null || shippingCode === null || cost === null) {
    return null;
  }
  return {
    location: stringValue(shipment.location) ?? "default",
    type: stringValue(shipment.type),
    shipping_quote_id: shippingQuoteId,
    shipping_code: shippingCode,
    cost,
    days_in_transit: numberValue(shipping.days_in_transit),
    verbose_eta: stringValue(shipping.verbose_eta),
    saturday_delivery: booleanValue(shipping.saturday_delivery),
    signature_required: booleanValue(shipping.signature_required),
    dropship_controller_id: numberValue(shipping.dropship_controller_id),
  };
}

function collectFees(quoteResponse: Record<string, unknown>) {
  const shipments = arrayPath(quoteResponse, ["data", "attributes", "shipment"]);
  return shipments.flatMap((shipment) =>
    arrayValue(objectValue(shipment)?.fees).flatMap((fee) => {
      const feeRecord = objectValue(fee);
      const amount = numberValue(feeRecord?.fee_amount);
      return amount === null ? [] : [amount];
    }),
  );
}

function numericPath(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    current = objectValue(current)?.[key];
  }
  return numberValue(current);
}

function arrayPath(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    current = objectValue(current)?.[key];
  }
  return arrayValue(current);
}

function objectValue(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value: unknown) {
  return value === true;
}

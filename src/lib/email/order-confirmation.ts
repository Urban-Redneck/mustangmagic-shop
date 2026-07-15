type OrderItem = {
  partNumber: string | null;
  productName: string;
  quantity: number;
  amountTotal: number;
  currency: string;
};

type Address = object | null;

type OrderConfirmationInput = {
  to: string | null;
  customerName: string | null;
  orderNumber: string;
  stripeSessionId: string;
  turn14OrderId: string | null;
  fulfillmentStatus: string;
  amountTotal: number;
  currency: string;
  shippingAddress: Address;
  items: OrderItem[];
};

type EmailResult =
  | {
      status: "sent";
      resend_id: string | null;
      sent_at: string;
    }
  | {
      status: "skipped";
      reason: string;
      skipped_at: string;
    }
  | {
      status: "failed";
      error: string;
      failed_at: string;
    };

export async function sendOrderConfirmationEmail(
  input: OrderConfirmationInput,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;

  if (!apiKey) {
    return skipped("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    return skipped("ORDER_EMAIL_FROM is not configured.");
  }

  if (!input.to) {
    return skipped("Order is missing a customer email.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Mustang Magic order ${input.orderNumber}`,
      html: buildHtml(input),
      text: buildText(input),
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!response.ok) {
    return {
      status: "failed",
      error: payload?.message ?? `Resend returned HTTP ${response.status}.`,
      failed_at: new Date().toISOString(),
    };
  }

  return {
    status: "sent",
    resend_id: payload?.id ?? null,
    sent_at: new Date().toISOString(),
  };
}

function skipped(reason: string): EmailResult {
  return {
    status: "skipped",
    reason,
    skipped_at: new Date().toISOString(),
  };
}

function buildHtml(input: OrderConfirmationInput) {
  const customer = input.customerName ? ` ${escapeHtml(input.customerName)}` : "";
  const total = formatMoney(input.amountTotal, input.currency);
  const orderStatus =
    input.turn14OrderId && input.fulfillmentStatus === "ordered"
      ? `Your order has been submitted to our distributor. Turn14 order ID: ${escapeHtml(input.turn14OrderId)}.`
      : "Your order is paid and being reviewed for fulfillment.";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="background:#09090b;color:#ffffff;padding:24px;">
                <div style="font-size:20px;font-weight:800;">Mustang Magic &amp; American Speed</div>
                <div style="margin-top:6px;color:#fde047;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Order confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Thanks${customer}, we received your order.</h1>
                <p style="margin:0 0 18px;line-height:1.6;color:#52525b;">${escapeHtml(orderStatus)} We will send tracking details as soon as they are available.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">
                  <tr>
                    <td style="border-top:1px solid #e4e4e7;padding:10px 0;color:#71717a;">Order</td>
                    <td align="right" style="border-top:1px solid #e4e4e7;padding:10px 0;font-weight:700;">${escapeHtml(input.orderNumber)}</td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #e4e4e7;padding:10px 0;color:#71717a;">Total</td>
                    <td align="right" style="border-top:1px solid #e4e4e7;padding:10px 0;font-weight:700;">${escapeHtml(total)}</td>
                  </tr>
                </table>
                <h2 style="margin:24px 0 10px;font-size:18px;">Items</h2>
                ${buildItemRows(input.items)}
                <h2 style="margin:24px 0 10px;font-size:18px;">Shipping address</h2>
                <p style="margin:0;line-height:1.6;color:#52525b;">${formatAddress(input.shippingAddress)}</p>
                <p style="margin:24px 0 0;line-height:1.6;color:#52525b;">Questions? Reply to this email or call us at (631) 254-3430.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildItemRows(items: OrderItem[]) {
  if (items.length === 0) {
    return `<p style="margin:0;color:#52525b;">Order items are being finalized.</p>`;
  }

  const rows = items
    .map(
      (item) => `<tr>
        <td style="border-top:1px solid #e4e4e7;padding:12px 0;">
          <div style="font-weight:700;">${escapeHtml(item.productName)}</div>
          ${
            item.partNumber
              ? `<div style="margin-top:4px;color:#71717a;font-size:13px;">Part #${escapeHtml(item.partNumber)}</div>`
              : ""
          }
          <div style="margin-top:4px;color:#71717a;font-size:13px;">Qty ${item.quantity}</div>
        </td>
        <td align="right" style="border-top:1px solid #e4e4e7;padding:12px 0;font-weight:700;">${escapeHtml(
          formatMoney(item.amountTotal, item.currency),
        )}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>`;
}

function buildText(input: OrderConfirmationInput) {
  const lines = [
    "Mustang Magic & American Speed",
    "",
    `Order confirmation: ${input.orderNumber}`,
    `Total: ${formatMoney(input.amountTotal, input.currency)}`,
    "",
    input.turn14OrderId && input.fulfillmentStatus === "ordered"
      ? `Your order has been submitted to our distributor. Turn14 order ID: ${input.turn14OrderId}.`
      : "Your order is paid and being reviewed for fulfillment.",
    "We will send tracking details as soon as they are available.",
    "",
    "Items:",
    ...input.items.map(
      (item) =>
        `- ${item.productName}${item.partNumber ? ` (${item.partNumber})` : ""} x${item.quantity}: ${formatMoney(
          item.amountTotal,
          item.currency,
        )}`,
    ),
    "",
    "Shipping address:",
    plainAddress(input.shippingAddress),
    "",
    "Questions? Reply to this email or call us at (631) 254-3430.",
  ];

  return lines.join("\n");
}

function formatAddress(address: Address) {
  return escapeHtml(plainAddress(address)).replace(/\n/g, "<br>");
}

function plainAddress(address: Address) {
  if (!address) {
    return "Not provided";
  }

  const addressRecord = objectValue(address);
  if (!addressRecord) {
    return "Not provided";
  }

  const nestedAddress = objectValue(addressRecord.address);
  const parts = [
    stringValue(addressRecord.name),
    stringValue(addressRecord.line1) ?? stringValue(nestedAddress?.line1),
    stringValue(addressRecord.line2) ?? stringValue(nestedAddress?.line2),
    [
      stringValue(addressRecord.city) ?? stringValue(nestedAddress?.city),
      stringValue(addressRecord.state) ?? stringValue(nestedAddress?.state),
      stringValue(addressRecord.postal_code) ??
        stringValue(nestedAddress?.postal_code),
    ]
      .filter(Boolean)
      .join(", "),
    stringValue(addressRecord.country) ?? stringValue(nestedAddress?.country),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : "Not provided";
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

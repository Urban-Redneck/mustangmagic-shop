type TrackingItem = {
  partNumber: string | null;
  productName: string | null;
  quantity: number | null;
};

type TrackingNotificationInput = {
  to: string | null;
  customerName: string | null;
  orderNumber: string;
  trackingNumber: string;
  carrierName: string | null;
  service: string | null;
  shipDate: string | null;
  items: TrackingItem[];
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

export async function sendTrackingNotificationEmail(
  input: TrackingNotificationInput,
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
    return skipped("Shipment is missing a customer email.");
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
      subject: `Mustang Magic tracking for ${input.orderNumber}`,
      html: buildHtml(input),
      text: buildText(input),
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string }
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

function buildHtml(input: TrackingNotificationInput) {
  const customer = input.customerName ? ` ${escapeHtml(input.customerName)}` : "";
  const carrier = [input.carrierName, input.service].filter(Boolean).join(" ");

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
                <div style="margin-top:6px;color:#fde047;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Tracking update</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">Good news${customer}, part of your order has shipped.</h1>
                <p style="margin:0 0 18px;line-height:1.6;color:#52525b;">Tracking is now available for order ${escapeHtml(input.orderNumber)}.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">
                  <tr>
                    <td style="border-top:1px solid #e4e4e7;padding:10px 0;color:#71717a;">Tracking number</td>
                    <td align="right" style="border-top:1px solid #e4e4e7;padding:10px 0;font-weight:700;">${escapeHtml(input.trackingNumber)}</td>
                  </tr>
                  ${
                    carrier
                      ? `<tr><td style="border-top:1px solid #e4e4e7;padding:10px 0;color:#71717a;">Carrier</td><td align="right" style="border-top:1px solid #e4e4e7;padding:10px 0;font-weight:700;">${escapeHtml(carrier)}</td></tr>`
                      : ""
                  }
                  ${
                    input.shipDate
                      ? `<tr><td style="border-top:1px solid #e4e4e7;padding:10px 0;color:#71717a;">Ship date</td><td align="right" style="border-top:1px solid #e4e4e7;padding:10px 0;font-weight:700;">${escapeHtml(input.shipDate)}</td></tr>`
                      : ""
                  }
                </table>
                <h2 style="margin:24px 0 10px;font-size:18px;">Shipment items</h2>
                ${buildItemRows(input.items)}
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

function buildItemRows(items: TrackingItem[]) {
  if (items.length === 0) {
    return `<p style="margin:0;color:#52525b;">Shipment item details are being finalized.</p>`;
  }

  const rows = items
    .map(
      (item) => `<tr>
        <td style="border-top:1px solid #e4e4e7;padding:12px 0;">
          <div style="font-weight:700;">${escapeHtml(item.productName ?? "Shipped item")}</div>
          ${
            item.partNumber
              ? `<div style="margin-top:4px;color:#71717a;font-size:13px;">Part #${escapeHtml(item.partNumber)}</div>`
              : ""
          }
        </td>
        <td align="right" style="border-top:1px solid #e4e4e7;padding:12px 0;font-weight:700;">Qty ${escapeHtml(
          String(item.quantity ?? 1),
        )}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>`;
}

function buildText(input: TrackingNotificationInput) {
  const carrier = [input.carrierName, input.service].filter(Boolean).join(" ");
  const lines = [
    "Mustang Magic & American Speed",
    "",
    `Tracking update for order ${input.orderNumber}`,
    `Tracking number: ${input.trackingNumber}`,
    carrier ? `Carrier: ${carrier}` : null,
    input.shipDate ? `Ship date: ${input.shipDate}` : null,
    "",
    "Shipment items:",
    ...input.items.map(
      (item) =>
        `- ${item.productName ?? "Shipped item"}${item.partNumber ? ` (${item.partNumber})` : ""} x${item.quantity ?? 1}`,
    ),
    "",
    "Questions? Reply to this email or call us at (631) 254-3430.",
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

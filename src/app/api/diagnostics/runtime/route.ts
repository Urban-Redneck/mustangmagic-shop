import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    env: {
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
      STRIPE_Sec_key: Boolean(process.env.STRIPE_Sec_key),
      STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      CART_SIGNING_SECRET: Boolean(process.env.CART_SIGNING_SECRET),
      SITE_URL: Boolean(process.env.SITE_URL),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      ORDER_EMAIL_FROM: Boolean(process.env.ORDER_EMAIL_FROM),
    },
    siteUrl: {
      SITE_URL: describeUrl(process.env.SITE_URL),
      NEXT_PUBLIC_SITE_URL: describeUrl(process.env.NEXT_PUBLIC_SITE_URL),
    },
  });
}

function describeUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      hasWhitespace: /\s/.test(value),
      valid: true,
    };
  } catch {
    return {
      protocol: null,
      hostname: null,
      pathname: null,
      hasWhitespace: /\s/.test(value),
      valid: false,
    };
  }
}

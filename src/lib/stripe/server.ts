import Stripe from "stripe";

let stripe: Stripe | null | undefined;

export function getStripeServerClient() {
  if (stripe !== undefined) {
    return stripe;
  }

  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    stripe = null;
    return stripe;
  }

  stripe = new Stripe(secretKey);
  return stripe;
}

function getStripeSecretKey() {
  const candidates = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_Sec_key,
  ].filter(Boolean);

  return candidates.find((key) => key?.startsWith("sk_") || key?.startsWith("rk_")) ?? null;
}

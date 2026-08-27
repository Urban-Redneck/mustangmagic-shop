# Helcim implementation plan

Online checkout remains disabled while this work is being built.

## Server-only configuration

Set these only in Vercel server environment variables; do not use `NEXT_PUBLIC_`
for any of them:

- `HELCIM_API_TOKEN`
- `HELCIM_WEBHOOK_VERIFIER_TOKEN`
- `HELCIM_API_BASE_URL` (optional; defaults to `https://api.helcim.com/v2`)
- `HELCIM_CURRENCY` (optional; defaults to `USD`)

The API access configuration in Helcim must whitelist the production storefront
domain and any test/preview domain used for payment testing.

## Intended payment sequence

1. Revalidate the cart and create a short-lived Turn14 quote.
2. Persist the quote, selected shipping, customer details, and exact total.
3. Initialize a HelcimPay.js session from the server.
4. Prefer `preauthorize` while Turn14 order acceptance is pending.
5. Let HelcimPay.js collect payment details in its secure iframe.
6. Verify the payment result and the signed Helcim webhook server-side.
7. Confirm the Helcim amount and currency match the stored quote.
8. Submit the accepted quote to Turn14 exactly once using a fulfillment attempt
   idempotency key.
9. Capture the authorization, or reverse it if Turn14 cannot accept the order.

Never store full card numbers, expiry dates, CVV values, or payment tokens in
Supabase, application logs, analytics, or customer-visible URLs.

## Webhook setup

The webhook route should not be enabled until its handler exists and is deployed.
Helcim webhook URLs must be HTTPS and cannot contain the word `Helcim`; use a
neutral path such as `/api/webhooks/payment-events`.

The handler must read the raw request body, verify the HMAC signature, reject
stale/replayed events, record the provider event idempotently, and return a 2xx
only after the event is safely recorded.

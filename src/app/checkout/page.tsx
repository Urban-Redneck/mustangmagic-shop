"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useState } from "react";
import { HelcimPayButton } from "@/components/checkout/helcim-pay-button";

type CheckoutSession = {
  intentId: string;
  amountCents: number;
  currency: string;
  checkoutToken: string;
  secretToken: string;
};

export default function CheckoutPage() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSession(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/checkout/initialize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const payload = (await response.json()) as CheckoutSession & { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Checkout could not be initialized.");
      return;
    }
    setSession(payload);
  }

  return (
    <>
      <Script src="https://secure.helcim.app/helcim-pay/services/start.js" />
      <main className="bg-zinc-50">
        <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
          <Link href="/cart" className="text-sm font-black uppercase tracking-wide text-red-700">
            Back to cart
          </Link>
          <p className="mt-10 text-sm font-black uppercase tracking-[0.18em] text-red-700">
            Secure checkout
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
            Confirm your shipping details
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600">
            We will recheck product availability and shipping with Turn14 before opening the secure payment form.
          </p>

          <form onSubmit={submit} className="mt-10 grid gap-6 border border-zinc-200 bg-white p-6 sm:p-8">
            <section className="grid gap-4">
              <h2 className="text-lg font-black text-zinc-950">Contact</h2>
              <input required name="contactName" placeholder="Full name" className={fieldClass} />
              <div className="grid gap-4 sm:grid-cols-2">
                <input required type="email" name="contactEmail" placeholder="Email address" className={fieldClass} />
                <input required name="contactPhone" placeholder="Phone number" className={fieldClass} />
              </div>
            </section>

            <section className="grid gap-4 border-t border-zinc-200 pt-6">
              <h2 className="text-lg font-black text-zinc-950">Shipping address</h2>
              <input required name="addressLine1" placeholder="Street address" className={fieldClass} />
              <input name="addressLine2" placeholder="Apartment, suite, or unit (optional)" className={fieldClass} />
              <div className="grid gap-4 sm:grid-cols-[1fr_7rem_8rem]">
                <input required name="city" placeholder="City" className={fieldClass} />
                <input required name="state" placeholder="State" className={fieldClass} />
                <input required name="postalCode" placeholder="ZIP code" className={fieldClass} />
              </div>
            </section>

            {error ? <p className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
            {!session ? (
              <button disabled={loading} className="rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800 disabled:opacity-60">
                {loading ? "Checking availability…" : "Continue to secure payment"}
              </button>
            ) : (
              <div className="grid gap-4 border-t border-zinc-200 pt-6">
                <p className="text-sm font-bold text-zinc-700">
                  Turn14 confirmed the cart. Final checkout total: {formatMoney(session.amountCents, session.currency)}
                </p>
                <HelcimPayButton
                  intentId={session.intentId}
                  checkoutToken={session.checkoutToken}
                  secretToken={session.secretToken}
                />
              </div>
            )}
          </form>
        </div>
      </main>
    </>
  );
}

const fieldClass = "min-h-12 rounded border border-zinc-300 px-4 text-sm font-semibold text-zinc-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/20";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

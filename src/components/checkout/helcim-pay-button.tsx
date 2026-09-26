"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

declare global {
  function appendHelcimPayIframe(checkoutToken: string): void;
  function removeHelcimPayIframe(): void;
}

type HelcimPayButtonProps = {
  intentId: string;
  checkoutToken: string;
  secretToken: string;
};

export function HelcimPayButton({
  intentId,
  checkoutToken,
  secretToken,
}: HelcimPayButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.eventName !== `helcim-pay-js-${checkoutToken}`) {
        return;
      }

      if (event.data.eventStatus === "ABORTED") {
        removeHelcimPayIframe();
        setMessage("The payment was declined or cancelled. No order was placed.");
        return;
      }

      if (event.data.eventStatus === "HIDE") {
        removeHelcimPayIframe();
        return;
      }

      if (event.data.eventStatus !== "SUCCESS") {
        return;
      }

      setMessage("Payment received. Confirming your order...");
      void fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intentId,
          checkoutToken,
          secretToken,
          response: event.data.eventMessage,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(payload.error ?? "Payment confirmation failed.");
          }
          setMessage(
            "Payment authorized. Your order is being sent for fulfillment review.",
          );
          setCompleted(true);
          removeHelcimPayIframe();
        })
        .catch((error: unknown) => {
          setMessage(
            error instanceof Error
              ? error.message
              : "Payment confirmation failed. Contact the shop before retrying.",
          );
          removeHelcimPayIframe();
        });
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [checkoutToken, intentId, secretToken]);

  if (completed) {
    return (
      <div className="rounded border border-green-200 bg-green-50 p-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-green-700">
          Thank you for your business
        </p>
        <h2 className="mt-2 text-2xl font-black text-zinc-950">
          Payment authorized
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-700">
          Your payment was authorized successfully. Your order is being sent
          for fulfillment review.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/parts"
            className="rounded bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
          >
            Continue shopping
          </Link>
          <Link
            href="/"
            className="rounded border border-zinc-300 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        className="w-full rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          setMessage(null);
          appendHelcimPayIframe(checkoutToken);
        }}
      >
        Pay securely with Helcim
      </button>
      {message ? <p className="text-sm font-semibold text-zinc-700">{message}</p> : null}
    </div>
  );
}

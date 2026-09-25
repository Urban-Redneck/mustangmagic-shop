"use client";

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

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.eventName !== `helcim-pay-js-${checkoutToken}`) {
        return;
      }

      if (event.data.eventStatus === "ABORTED") {
        setMessage("The payment was declined or cancelled. No order was placed.");
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
          removeHelcimPayIframe();
        })
        .catch((error: unknown) => {
          setMessage(
            error instanceof Error
              ? error.message
              : "Payment confirmation failed. Contact the shop before retrying.",
          );
        });
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [checkoutToken, intentId, secretToken]);

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

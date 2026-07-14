import type Stripe from "stripe";
import type { CheckoutProduct } from "@/lib/checkout/products";

export function buildStripeLineItem(
  product: CheckoutProduct,
  quantity: number,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity,
    price_data: {
      currency: "usd",
      unit_amount: dollarsToCents(product.price),
      product_data: {
        name: product.name,
        description: product.shortDescription ?? `Part #${product.partNumber}`,
        images: product.primaryImageUrl ? [product.primaryImageUrl] : [],
        metadata: {
          product_id: product.id,
          turn14_id: product.turn14Id,
          part_number: product.partNumber,
        },
      },
    },
  };
}

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

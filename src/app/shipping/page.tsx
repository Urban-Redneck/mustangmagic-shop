import type { Metadata } from "next";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "Shipping and delivery information for Mustang Magic parts orders.",
  robots: { index: false, follow: false },
};

export default function ShippingPage() {
  return (
    <DraftPage
      title="Shipping & delivery"
      intro="We are preparing shipping details for Mustang Magic parts orders so customers know what to expect before an order is accepted."
    >
      <DraftSection title="Before an order is accepted">
        <p>
          Product availability, supplier lead time, shipping method, shipping
          charges, taxes, and the delivery address should be confirmed with the
          shop before an order is finalized.
        </p>
      </DraftSection>
      <DraftSection title="Delivery timing">
        <p>
          Delivery estimates can vary by product, supplier, carrier, weather,
          and destination. A quoted estimate is not a guarantee until the shop
          confirms the order details.
        </p>
      </DraftSection>
      <DraftSection title="Damaged or incorrect shipments">
        <p>
          Keep the original packaging and photograph the package and product.
          Contact the shop promptly at{" "}
          <a className="font-bold text-red-700 hover:text-red-900" href="tel:+16312543430">
            (631) 254-3430
          </a>{" "}
          before installing or modifying a part that appears damaged or
          incorrect.
        </p>
      </DraftSection>
    </DraftPage>
  );
}

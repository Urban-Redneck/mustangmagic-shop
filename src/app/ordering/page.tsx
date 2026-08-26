import type { Metadata } from "next";
import Link from "next/link";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "How Parts Ordering Works",
  description: "How to review and order Mustang parts from Mustang Magic.",
  robots: { index: false, follow: false },
};

export default function OrderingPage() {
  return (
    <DraftPage
      eyebrow="Parts ordering"
      title="How parts ordering works"
      intro="Browse the catalog, collect parts for your build, and contact the shop to confirm the details while online checkout is being prepared."
    >
      <DraftSection title="1. Find the part">
        <p>
          Browse by Mustang generation, category, brand, or part number. Review
          the product details, fitment notes, availability, and displayed price.
        </p>
      </DraftSection>
      <DraftSection title="2. Review your selection">
        <p>
          Add priced items to the cart as a planning list. The cart is useful
          for organizing a build, but it is not currently a payment or order
          confirmation.
        </p>
      </DraftSection>
      <DraftSection title="3. Confirm with the shop">
        <p>
          Call (631) 254-3430 to confirm fitment, current availability, price,
          shipping, taxes, and any supporting parts before an order is accepted.
        </p>
      </DraftSection>
      <DraftSection title="4. Online checkout is coming later">
        <p>
          Helcim payment checkout will be added after the order, fulfillment,
          shipping, and customer-notification workflow has been reviewed and
          tested. No online payment is currently collected through this site.
        </p>
        <Link
          href="/parts"
          className="inline-flex w-fit rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
        >
          Browse Mustang parts
        </Link>
      </DraftSection>
    </DraftPage>
  );
}

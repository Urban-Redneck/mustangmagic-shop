import type { Metadata } from "next";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "Returns & Warranty Questions",
  description: "Return and warranty information for Mustang Magic customers.",
  robots: { index: false, follow: false },
};

export default function ReturnsPage() {
  return (
    <DraftPage
      title="Returns, refunds & warranty questions"
      intro="Return and warranty handling depends on the product, manufacturer, order status, and whether a part has been installed. Contact the shop before sending anything back."
    >
      <DraftSection title="Start with the shop">
        <p>
          Call (631) 254-3430 with your order or invoice information, part
          number, reason for the request, and photographs when relevant. Do not
          ship a return without receiving instructions from the shop.
        </p>
      </DraftSection>
      <DraftSection title="Things that may affect eligibility">
        <ul className="grid gap-2 pl-5 [&_li]:list-disc">
          <li>Whether the item is new, unused, complete, and resalable</li>
          <li>Whether the part has been installed, modified, or damaged</li>
          <li>Whether it was special-order, custom, clearance, or supplier-restricted</li>
          <li>The manufacturer&apos;s warranty and return requirements</li>
        </ul>
      </DraftSection>
      <DraftSection title="Warranty concerns">
        <p>
          If a part appears defective, stop installation or use when practical
          and contact the shop. Manufacturer warranty procedures may require
          inspection, diagnostic information, photographs, or direct
          manufacturer involvement.
        </p>
      </DraftSection>
    </DraftPage>
  );
}

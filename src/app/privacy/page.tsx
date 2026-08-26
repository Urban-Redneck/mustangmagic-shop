import type { Metadata } from "next";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "Privacy notice draft for Mustang Magic & American Speed.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <DraftPage
      title="Privacy notice"
      intro="This draft explains the categories of information the website may receive while customers browse the catalog, use the cart, contact the shop, or interact with store tools."
    >
      <DraftSection title="Information customers provide">
        <p>
          Depending on which features are used, customers may provide contact
          details, vehicle information, parts questions, order information, and
          messages sent to the shop.
        </p>
      </DraftSection>
      <DraftSection title="Information collected by the site">
        <p>
          The site may receive technical information such as browser, device,
          network, and page-request data needed to operate, secure, and improve
          the storefront. The cart uses browser storage mechanisms to remember
          selected products.
        </p>
      </DraftSection>
      <DraftSection title="How information may be used">
        <ul className="grid gap-2 pl-5 [&_li]:list-disc">
          <li>Respond to parts, service, fitment, and ordering questions</li>
          <li>Operate and secure the catalog and cart</li>
          <li>Coordinate fulfillment, support, and service requests</li>
          <li>Maintain records required for business operations and compliance</li>
        </ul>
      </DraftSection>
      <DraftSection title="Questions and requests">
        <p>
          Privacy questions should be directed to Mustang Magic at (631)
          254-3430. The final notice will identify the business entity, vendors,
          retention practices, customer choices, and any legally required
          disclosures after counsel review.
        </p>
      </DraftSection>
    </DraftPage>
  );
}

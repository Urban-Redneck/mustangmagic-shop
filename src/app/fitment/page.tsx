import type { Metadata } from "next";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "Mustang Fitment Guide",
  description: "A practical Mustang parts fitment guide from Mustang Magic.",
  robots: { index: false, follow: false },
};

export default function FitmentPage() {
  return (
    <DraftPage
      eyebrow="Build with confidence"
      title="Mustang fitment guide"
      intro="The right part starts with the right vehicle details. Use this guide before adding a part to your build plan, then confirm the final fitment with Mustang Magic or the manufacturer."
    >
      <DraftSection title="Have these details ready">
        <ul className="grid gap-2 pl-5 [&_li]:list-disc">
          <li>Model year and Mustang generation</li>
          <li>Trim, engine, transmission, and drivetrain</li>
          <li>Convertible or fastback body style when relevant</li>
          <li>Current modifications and intended use</li>
          <li>Whether the vehicle must remain emissions-compliant for street use</li>
        </ul>
      </DraftSection>
      <DraftSection title="Why fitment can be complicated">
        <p>
          A part may depend on more than model year. Mid-year changes, engine
          combinations, factory options, previous modifications, supporting
          hardware, and intended use can all affect the result.
        </p>
      </DraftSection>
      <DraftSection title="When to call">
        <p>
          Call (631) 254-3430 when a listing is unclear, your Mustang has
          modifications, or you are planning several related upgrades. The shop
          can help connect parts, fuel, tuning, and installation requirements.
        </p>
      </DraftSection>
    </DraftPage>
  );
}

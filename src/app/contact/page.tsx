import type { Metadata } from "next";
import { DraftPage, DraftSection } from "@/components/content/draft-page";

export const metadata: Metadata = {
  title: "Contact Mustang Magic",
  description: "Contact Mustang Magic & American Speed in Deer Park, New York.",
  robots: { index: false, follow: false },
};

export default function ContactPage() {
  return (
    <DraftPage
      eyebrow="Start a conversation"
      title="Contact Mustang Magic"
      intro="Tell us what you are building, what you drive, and what you need help solving. The shop can help with Mustang parts, fitment, dyno tuning, installation, diagnostics, and repair."
    >
      <DraftSection title="Call the shop">
        <p>
          The fastest way to reach Mustang Magic &amp; American Speed is by
          phone at{" "}
          <a className="font-bold text-red-700 hover:text-red-900" href="tel:+16312543430">
            (631) 254-3430
          </a>
          .
        </p>
        <p>Mustang Magic is located in Deer Park, New York.</p>
      </DraftSection>
      <DraftSection title="What to include">
        <ul className="grid gap-2 pl-5 [&_li]:list-disc">
          <li>Mustang year, generation, trim, engine, and transmission</li>
          <li>Current modifications and the parts you are considering</li>
          <li>Your goal: street driving, track use, power, handling, or reliability</li>
          <li>Any fitment, drivability, warning-light, or installation concern</li>
        </ul>
      </DraftSection>
      <DraftSection title="Parts questions">
        <p>
          Online checkout is temporarily disabled while the store completes
          its payment and order workflow. Use the phone number above to confirm
          price, availability, fitment, shipping, and ordering details.
        </p>
      </DraftSection>
    </DraftPage>
  );
}

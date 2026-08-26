import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions",
  description:
    "Terms of use, ordering terms, and return policy for Mustang Magic & American Speed.",
};

export default function TermsPage() {
  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="border border-zinc-200 bg-white p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
            Customer policies
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Last updated July 22, 2026. These terms are a business-policy draft
            and should be reviewed for your business and applicable law before
            publication.
          </p>

          <div className="mt-10 grid gap-8 text-sm leading-7 text-zinc-700">
            <PolicySection title="1. Using this website">
              <p>
                By using MustangMagic.store, you agree to these Terms &amp;
                Conditions. If you do not agree, please do not use the site. We
                may update these terms by posting a revised version here.
              </p>
              <p>
                You may not misuse the site, interfere with its operation, or
                submit information that is inaccurate, unlawful, or belongs to
                someone else.
              </p>
            </PolicySection>

            <PolicySection title="2. Product information and fitment">
              <p>
                Product descriptions, photographs, specifications, availability,
                and fitment information are provided for general guidance and
                may contain supplier or catalog errors. A product that appears
                to fit a vehicle may still require additional parts,
                modifications, tools, or professional installation.
              </p>
              <p>
                Customers are responsible for confirming year, make, model,
                engine, trim, drivetrain, and intended use before ordering. When
                in doubt, contact Mustang Magic before placing an order. We are
                not responsible for damage caused by incorrect selection,
                improper installation, racing or competition use, or use
                outside the manufacturer&apos;s instructions.
              </p>
            </PolicySection>

            <PolicySection title="3. Prices, availability, and orders">
              <p>
                Prices and availability may change without notice. An order is
                not accepted until Mustang Magic confirms it. We may correct
                pricing or catalog errors, limit quantities, or cancel an order
                when an item is unavailable, discontinued, incorrectly listed,
                supplier-restricted, or cannot be fulfilled at the displayed
                terms.
              </p>
              <p>
                If we cancel an order after payment has been collected, we will
                issue a refund to the original payment method. Shipping charges,
                taxes, and applicable fees will be shown or confirmed before the
                order is finalized.
              </p>
            </PolicySection>

            <PolicySection title="4. Shipping and delivery">
              <p>
                Orders ship to the address provided by the customer. Customers
                are responsible for reviewing the address before the order is
                finalized. Delivery estimates are estimates, not guarantees, and
                may be affected by supplier lead times, carrier delays, weather,
                or events outside our control.
              </p>
              <p>
                Inspect every shipment promptly. Keep the packaging and shipping
                materials if an item arrives damaged, and contact us within 5
                calendar days with photographs of the package and product so we
                can assist with a carrier or supplier claim.
              </p>
            </PolicySection>

            <PolicySection title="5. Returns and refunds">
              <p>
                Subject to the exclusions below, new, unused, and uninstalled
                parts may be returned when Mustang Magic receives the return
                request by 11:59 p.m. Eastern Time on the 30th calendar day
                after delivery. This is a firm deadline. You must contact us
                and receive a return authorization before sending anything back.
                Requests received after this deadline, and unauthorized returns,
                are not eligible for a non-defective return.
              </p>
              <ul>
                <li>Items must be resalable with all original packaging, hardware, manuals, labels, and accessories.</li>
                <li>The customer is responsible for return shipping unless the item arrived damaged, defective, or materially different from the order.</li>
                <li>Eligible non-defective returns may be subject to a 20% restocking fee, deducted from the refund.</li>
                <li>Refunds are processed after inspection and sent to the original payment method. Banks and card issuers may require additional time to post the refund.</li>
              </ul>
              <p>
                To request a return, call{" "}
                <a className="font-bold text-red-700 hover:text-red-900" href="tel:+16312543430">
                  (631) 254-3430
                </a>{" "}
                with your order number, part number, reason for the return, and
                photographs when relevant.
              </p>
            </PolicySection>

            <PolicySection title="6. Items that are not returnable">
              <p>
                Unless required by law or covered by a confirmed warranty or
                shipping claim, the following items are generally not eligible
                for return:
              </p>
              <ul>
                <li>Installed, used, modified, damaged, or incomplete parts.</li>
                <li>Electrical, electronic, fuel, ignition, or opened fluid-related items.</li>
                <li>Custom-built, personalized, clearance, or final-sale items.</li>
                <li>Special-order, non-stock, drop-ship, or supplier-restricted items.</li>
                <li>Items without their original packaging, labels, hardware, or accessories.</li>
              </ul>
              <p>
                Some manufacturers impose additional return rules or fees. Those
                rules will apply when disclosed before the order is accepted.
              </p>
            </PolicySection>

            <PolicySection title="7. Defective, damaged, or incorrect items">
              <p>
                Contact us before installing or modifying an item that appears
                damaged, defective, or incorrect. Do not throw away the
                packaging. We may request photographs, diagnostic information, or
                inspection by the manufacturer before approving a replacement,
                repair, or refund. Manufacturer warranties apply according to
                the manufacturer&apos;s terms and may require the customer to work
                through the manufacturer&apos;s warranty process.
              </p>
            </PolicySection>

            <PolicySection title="8. Limitation of liability">
              <p>
                To the maximum extent permitted by law, Mustang Magic &amp;
                American Speed is not liable for indirect, incidental, special,
                or consequential loss, including loss arising from vehicle
                downtime, labor, towing, lost use, or damage resulting from
                installation or use of a product. Nothing in these terms excludes
                rights or remedies that cannot legally be excluded.
              </p>
            </PolicySection>

            <PolicySection title="9. Contact">
              <p>
                Mustang Magic &amp; American Speed
                <br />Deer Park, New York
                <br />
                <a className="font-bold text-red-700 hover:text-red-900" href="tel:+16312543430">
                  (631) 254-3430
                </a>
              </p>
            </PolicySection>
          </div>

          <div className="mt-10 border-t border-zinc-200 pt-6">
            <Link
              href="/parts"
              className="inline-flex rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
            >
              Browse parts
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-black tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-3 grid gap-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-2">
        {children}
      </div>
    </section>
  );
}

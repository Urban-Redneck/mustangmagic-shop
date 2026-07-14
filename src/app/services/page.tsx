import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/catalog/page-heading";

export const metadata: Metadata = {
  title: "Mustang Performance Services | MustangMagic.com",
  description:
    "Mustang Magic & American Speed provides Mustang dyno tuning, installations, diagnostics, repair, inspections, oil changes, and performance upgrades in Deer Park, New York.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Mustang Performance Services | MustangMagic.com",
    description:
      "Dyno tuning, Mustang performance installations, diagnostics, repair, inspections, oil changes, and parts support from Mustang Magic & American Speed.",
    url: "/services",
    type: "website",
  },
};

const serviceGroups = [
  {
    title: "Tuning",
    services: [
      "Dyno tuning",
      "Custom tuning",
      "Remote tuning support",
      "E85 and flex-fuel tuning",
    ],
  },
  {
    title: "Power and fuel",
    services: [
      "Cold-air intake installation",
      "Supercharger installation",
      "Turbocharger installation",
      "Fuel-system upgrades",
    ],
  },
  {
    title: "Exhaust and drivetrain",
    services: [
      "Headers and exhaust installation",
      "Clutch and drivetrain work",
      "Brakes",
      "Wheels and tires",
    ],
  },
  {
    title: "Chassis and maintenance",
    services: [
      "Suspension upgrades",
      "Stop the Hop packages",
      "Diagnostics",
      "Mustang repair",
      "New York State inspections",
      "Performance oil changes",
    ],
  },
];

export default function ServicesPage() {
  return (
    <main className="bg-zinc-50">
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">
            Performance Services
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight">
            Mustang dyno tuning, installations, diagnostics, and repair.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Mustang Magic & American Speed supports Ford Mustang owners with
            in-house chassis dyno work, custom tuning, performance
            installations, maintenance, and parts planning from Deer Park, New
            York.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="tel:+16312543430"
              className="rounded bg-yellow-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-yellow-300"
            >
              Call (631) 254-3430
            </a>
            <Link
              href="/parts"
              className="rounded border border-zinc-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:border-yellow-300 hover:text-yellow-200"
            >
              Shop Mustang Parts
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <PageHeading
          eyebrow="Service Menu"
          title="Build support from bolt-ons to complete combinations"
          description="Use this overview to start a conversation with the shop. Service-specific pages will be added in later phases without duplicating the existing store systems."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {serviceGroups.map((group) => (
            <section
              key={group.title}
              className="rounded border border-zinc-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black text-zinc-950">
                {group.title}
              </h2>
              <ul className="mt-5 grid gap-3">
                {group.services.map((service) => (
                  <li
                    key={service}
                    className="flex gap-3 text-sm font-semibold leading-6 text-zinc-700"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { CatalogLinks } from "@/components/catalog/catalog-links";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import {
  getCategories,
  getFeaturedProducts,
  getMustangGenerations,
} from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, generations, categories] = await Promise.all([
    getFeaturedProducts(8),
    getMustangGenerations(),
    getCategories(6),
  ]);

  return (
    <main>
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-18">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">
              Mustang Magic & American Speed
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
              Mustang Performance, Parts and Dyno Tuning
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              From custom dyno tuning and complete performance builds to
              carefully selected Mustang parts, Mustang Magic helps owners build
              faster, better-performing Mustangs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/services"
                className="rounded bg-yellow-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-yellow-300"
              >
                View Performance Services
              </Link>
              <Link
                href="/parts"
                className="rounded border border-zinc-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:border-yellow-300 hover:text-yellow-200"
              >
                Shop Mustang Parts
              </Link>
            </div>
            <dl className="mt-8 grid max-w-2xl gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Location
                </dt>
                <dd className="mt-1 font-semibold text-zinc-100">
                  Deer Park, New York
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Phone
                </dt>
                <dd className="mt-1">
                  <a className="font-semibold text-yellow-300 hover:text-yellow-200" href="tel:+16312543430">
                    (631) 254-3430
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Focus
                </dt>
                <dd className="mt-1 font-semibold text-zinc-100">
                  Ford Mustang performance
                </dd>
              </div>
            </dl>
          </div>
          <div className="grid gap-4">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-300">
                Performance Services
              </p>
              <p className="mt-4 text-3xl font-black text-white">
                Dyno tuning, installations, diagnostics, and Mustang repair.
              </p>
              <Link
                href="/services"
                className="mt-6 inline-flex rounded bg-yellow-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-yellow-300"
              >
                View Performance Services
              </Link>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-300">
                Mustang Parts Store
              </p>
              <p className="mt-4 text-3xl font-black text-white">
                Search parts by generation, brand, category, or part number.
              </p>
              <div className="mt-6">
                <SearchForm action="/parts" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <PageHeading
            eyebrow="Services"
            title="Mustang performance work from a Mustang-focused shop"
            description="Mustang Magic & American Speed supports street cars, dyno tuning, bolt-on installations, fuel-system upgrades, chassis work, diagnostics, and maintenance for Ford Mustang owners."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredServices.map((service) => (
              <Link
                key={service.title}
                href="/services"
                className="rounded border border-zinc-200 bg-white p-5 transition hover:border-yellow-500 hover:shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-700">
                  {service.kicker}
                </p>
                <h2 className="mt-3 text-xl font-black text-zinc-950">
                  {service.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {service.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <PageHeading
              eyebrow="Shop"
              title="Popular Mustang parts"
              description="Browse the existing Mustang Magic catalog using the same product, price, image, fitment, cart, and checkout systems already built into the store."
            />
            <Link
              href="/parts"
              className="text-sm font-black uppercase tracking-wide text-yellow-700 hover:text-yellow-900"
            >
              Shop Mustang parts
            </Link>
          </div>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">
              Project Coyote
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">
              Plan horsepower around parts, fuel, tuning, and fitment.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FactCard title="Parts" body="Choose components that match the build goal and Mustang generation." />
            <FactCard title="Fuel" body="Plan E85, flex-fuel, injectors, and fuel-system requirements together." />
            <FactCard title="Tuning" body="Connect parts choices with dyno tuning and drivability needs." />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <PageHeading
            eyebrow="Generations"
            title="Browse by Mustang generation"
            description="Start with fitment first, then narrow by category or brand."
          />
          <div className="mt-8">
            <CatalogLinks
              emptyText="Seed Mustang generations in Supabase to populate this section."
              items={generations.map((generation) => ({
                href: `/parts?generation=${generation.slug}`,
                title: generation.name,
                description: generation.description,
                meta: `${generation.startYear}-${generation.endYear ?? "Now"}`,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <PageHeading
            eyebrow="Categories"
            title="Shop the build system"
            description="Curated storefront categories keep the catalog easy to scan."
          />
          <div className="mt-8">
            <CatalogLinks
              emptyText="Seed storefront categories in Supabase to populate this section."
              items={categories.map((category) => ({
                href: `/parts?category=${category.slug}`,
                title: category.name,
                description: category.description,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[1fr_24rem] lg:items-start lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-700">
              Dyno Tuning
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              Ready to tune or install your next Mustang upgrade?
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
              Call Mustang Magic & American Speed to discuss dyno tuning,
              installation work, diagnostics, inspections, or the parts needed
              for your build.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="tel:+16312543430"
                className="rounded bg-yellow-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 hover:bg-yellow-300"
              >
                Call (631) 254-3430
              </a>
              <Link
                href="/services"
                className="rounded border border-zinc-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-800 hover:border-zinc-950"
              >
                View Services
              </Link>
            </div>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
              Business Information
            </h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Business
                </dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  Mustang Magic & American Speed
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Location
                </dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  Deer Park, New York
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Phone
                </dt>
                <dd className="mt-1">
                  <a className="font-semibold text-yellow-700 hover:text-yellow-900" href="tel:+16312543430">
                    (631) 254-3430
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-wide text-zinc-500">
                  Hours
                </dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  Call for current shop hours and scheduling.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}

const featuredServices = [
  {
    kicker: "Dyno",
    title: "Custom tuning",
    description:
      "In-house chassis dyno support for Mustang calibration, drivability, power adders, and fuel changes.",
  },
  {
    kicker: "Install",
    title: "Headers and exhaust",
    description:
      "Header, exhaust, cold-air intake, and supporting bolt-on installation for Mustang performance builds.",
  },
  {
    kicker: "Power",
    title: "Forced induction",
    description:
      "Supercharger, turbocharger, fuel-system, E85, and flex-fuel planning for higher-output combinations.",
  },
  {
    kicker: "Chassis",
    title: "Suspension and drivetrain",
    description:
      "Stop the Hop packages, clutch work, brakes, wheels, tires, diagnostics, repair, inspections, and oil changes.",
  },
];

function FactCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-lg font-black text-yellow-300">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
    </div>
  );
}

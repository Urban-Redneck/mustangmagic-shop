import type { Metadata } from "next";
import { CatalogLinks } from "@/components/catalog/catalog-links";
import { PageHeading } from "@/components/catalog/page-heading";
import { getMustangGenerations } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Mustang Generations | MustangMagic.store",
  description: "Browse Mustang parts by Fox Body, SN95, S197, S550, or S650.",
};

export default async function GenerationsPage() {
  const generations = await getMustangGenerations();

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <PageHeading
          eyebrow="Generations"
          title="Pick your Mustang"
          description="Start with the chassis generation to keep fitment-focused browsing clean."
        />
        <div className="mt-8">
          <CatalogLinks
            emptyText="Seed Mustang generations in Supabase to populate this page."
            items={generations.map((generation) => ({
              href: `/parts?generation=${generation.slug}`,
              title: generation.name,
              description: generation.description,
              meta: `${generation.startYear}-${generation.endYear ?? "Now"}`,
            }))}
          />
        </div>
      </div>
    </main>
  );
}

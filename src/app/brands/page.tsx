import type { Metadata } from "next";
import { CatalogLinks } from "@/components/catalog/catalog-links";
import { PageHeading } from "@/components/catalog/page-heading";
import { getBrands } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Brands | MustangMagic.store",
  description: "Browse Mustang parts by manufacturer and performance brand.",
};

export default async function BrandsPage() {
  const brands = await getBrands(200);

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <PageHeading
          eyebrow="Brands"
          title="Shop by manufacturer"
          description="Find synced Turn14 products by brand once importer data is available in Supabase."
        />
        <div className="mt-8">
          <CatalogLinks
            emptyText="Sync Turn14 brands into Supabase to populate this page."
            items={brands.map((brand) => ({
              href: `/parts?brand=${brand.slug}`,
              title: brand.name,
              description: "View available Mustang parts from this brand.",
            }))}
          />
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import { getProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Search | MustangMagic.store",
  description: "Search Mustang parts by part number, brand, or product name.",
};

export const dynamic = "force-dynamic";

type SearchPageParams = {
  q?: string | string[];
  query?: string | string[];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const searchQuery = firstParam(params.q) ?? firstParam(params.query);
  const products = await getProducts({ query: searchQuery, limit: 36 });

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <PageHeading
          eyebrow="Search"
          title="Find Mustang parts"
          description="Search by part number, product name, brand, or keyword."
        />
        <div className="mt-8 max-w-3xl">
          <SearchForm defaultValue={searchQuery ?? ""} />
        </div>
        <section className="mt-10">
          <ProductGrid
            products={products}
            emptyTitle={searchQuery ? "No matching products" : "No products available"}
            emptyText={
              searchQuery
                ? "Try a different part number, brand, or product keyword."
                : "Search results will appear here from the Supabase catalog after products are imported."
            }
          />
        </section>
      </div>
    </main>
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

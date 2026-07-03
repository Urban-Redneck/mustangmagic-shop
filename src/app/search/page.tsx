import type { Metadata } from "next";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import { getProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Search | MustangMagic.store",
  description: "Search Mustang parts by part number, brand, or product name.",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const products = q ? await getProducts({ query: q, limit: 36 }) : [];

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <PageHeading
          eyebrow="Search"
          title="Find Mustang parts"
          description="Search by part number, product name, brand, or keyword."
        />
        <div className="mt-8 max-w-3xl">
          <SearchForm defaultValue={q} />
        </div>
        <section className="mt-10">
          <ProductGrid
            products={products}
            emptyTitle={q ? "No matching products" : "Enter a search term"}
            emptyText={
              q
                ? "Try a broader keyword or sync more Turn14 catalog data."
                : "Search results will appear here from the Supabase catalog."
            }
          />
        </section>
      </div>
    </main>
  );
}

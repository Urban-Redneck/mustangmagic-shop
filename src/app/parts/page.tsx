import type { Metadata } from "next";
import { CatalogLinks } from "@/components/catalog/catalog-links";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import {
  getBrands,
  getCategories,
  getMustangGenerations,
  getProducts,
} from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Parts | MustangMagic.store",
  description: "Browse Mustang performance parts by category, brand, and generation.",
};

type PartsSearchParams = {
  brand?: string | string[];
  category?: string | string[];
  generation?: string | string[];
  q?: string | string[];
  query?: string | string[];
};

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<PartsSearchParams>;
}) {
  const filters = await searchParams;
  const selectedBrand = firstParam(filters.brand);
  const selectedCategory = firstParam(filters.category);
  const selectedGeneration = firstParam(filters.generation);
  const searchQuery = firstParam(filters.q) ?? firstParam(filters.query);

  const [products, brands, categories, generations] = await Promise.all([
    getProducts({
      brand: selectedBrand,
      category: selectedCategory,
      generation: selectedGeneration,
      query: searchQuery,
      limit: 36,
    }),
    getBrands(12),
    getCategories(12),
    getMustangGenerations(),
  ]);

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <PageHeading
          eyebrow="Parts"
          title="Mustang performance catalog"
          description="Filter the Mustang Magic catalog by fitment, brand, category, or search term."
        />
        <div className="mt-8">
          <SearchForm action="/parts" defaultValue={searchQuery ?? ""} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className="grid h-fit gap-6">
            <FilterGroup
              title="Generations"
              emptyText="Add Mustang generations in Supabase to enable generation filters."
              items={generations.map((generation) => ({
                href: `/parts?generation=${generation.slug}`,
                label: generation.name,
                active: selectedGeneration === generation.slug,
              }))}
            />
            <FilterGroup
              title="Categories"
              emptyText="Add curated Mustang Magic categories in Supabase to enable category filters."
              items={categories.map((category) => ({
                href: `/parts?category=${category.slug}`,
                label: category.name,
                active: selectedCategory === category.slug,
              }))}
            />
            <FilterGroup
              title="Brands"
              emptyText="Brands will appear after Mustang products are imported."
              items={brands.map((brand) => ({
                href: `/parts?brand=${brand.slug}`,
                label: brand.name,
                active: selectedBrand === brand.slug,
              }))}
            />
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                  {products.length} results
                </p>
                <h2 className="text-2xl font-black text-zinc-950">
                  Catalog results
                </h2>
              </div>
              <a
                href="/parts"
                className="text-sm font-black uppercase tracking-wide text-red-700 hover:text-red-900"
              >
                Clear filters
              </a>
            </div>
            <ProductGrid products={products} />
          </section>
        </div>

        <div className="mt-14">
          <CatalogLinks
            emptyText="Seed categories to show additional browsing paths."
            items={categories.slice(0, 6).map((category) => ({
              href: `/parts?category=${category.slug}`,
              title: category.name,
              description: category.description,
            }))}
          />
        </div>
      </div>
    </main>
  );
}

function FilterGroup({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
        {title}
      </h2>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={[
                "rounded px-2 py-2 text-sm font-semibold hover:bg-zinc-100 hover:text-zinc-950",
                item.active
                  ? "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white"
                  : "text-zinc-600",
              ].join(" ")}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

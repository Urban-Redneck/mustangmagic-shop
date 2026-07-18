import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CatalogLinks } from "@/components/catalog/catalog-links";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SearchForm } from "@/components/catalog/search-form";
import {
  getBrands,
  getCategories,
  getMustangGenerations,
  getProductCount,
  getProducts,
} from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Parts | MustangMagic.store",
  description: "Browse Mustang performance parts by category, brand, and generation.",
};

type PartsSearchParams = {
  brand?: string | string[];
  brandPage?: string | string[];
  category?: string | string[];
  categoryPage?: string | string[];
  generation?: string | string[];
  page?: string | string[];
  q?: string | string[];
  query?: string | string[];
};

const PRODUCTS_PER_PAGE = 36;
const FILTERS_PER_PAGE = 12;

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
  const requestedPage = pageParam(filters.page);
  const requestedBrandPage = pageParam(filters.brandPage);
  const requestedCategoryPage = pageParam(filters.categoryPage);
  const productFilters = {
    brand: selectedBrand,
    category: selectedCategory,
    generation: selectedGeneration,
    query: searchQuery,
  };
  const brandOffset = (requestedBrandPage - 1) * FILTERS_PER_PAGE;
  const categoryOffset = (requestedCategoryPage - 1) * FILTERS_PER_PAGE;

  const [totalProducts, brands, categories, generations] = await Promise.all([
    getProductCount(productFilters),
    getBrands(FILTERS_PER_PAGE + 1, brandOffset),
    getCategories(FILTERS_PER_PAGE + 1, categoryOffset),
    getMustangGenerations(),
  ]);
  const visibleBrands = brands.slice(0, FILTERS_PER_PAGE);
  const visibleCategories = categories.slice(0, FILTERS_PER_PAGE);
  const hasPreviousBrandPage = requestedBrandPage > 1;
  const hasNextBrandPage = brands.length > FILTERS_PER_PAGE;
  const hasPreviousCategoryPage = requestedCategoryPage > 1;
  const hasNextCategoryPage = categories.length > FILTERS_PER_PAGE;
  const totalPages = Math.max(Math.ceil(totalProducts / PRODUCTS_PER_PAGE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await getProducts({
    ...productFilters,
    limit: PRODUCTS_PER_PAGE,
    offset: (currentPage - 1) * PRODUCTS_PER_PAGE,
  });
  const resultStart =
    totalProducts === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const resultEnd = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);
  const pageHref = (page: number) =>
    partsHref({
      brand: selectedBrand,
      category: selectedCategory,
      generation: selectedGeneration,
      query: searchQuery,
      page,
      brandPage: requestedBrandPage,
      categoryPage: requestedCategoryPage,
    });
  const sidebarPageHref = ({
    brandPage = requestedBrandPage,
    categoryPage = requestedCategoryPage,
  }: {
    brandPage?: number;
    categoryPage?: number;
  }) =>
    partsHref({
      brand: selectedBrand,
      category: selectedCategory,
      generation: selectedGeneration,
      query: searchQuery,
      page: currentPage,
      brandPage,
      categoryPage,
    });

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
                label: generationFilterLabel(generation),
                active: selectedGeneration === generation.slug,
              }))}
            />
            <FilterGroup
              title="Categories"
              emptyText="Add curated Mustang Magic categories in Supabase to enable category filters."
              items={visibleCategories.map((category) => ({
                href: `/parts?category=${category.slug}`,
                label: category.name,
                active: selectedCategory === category.slug,
              }))}
              controls={{
                previousHref: sidebarPageHref({
                  categoryPage: Math.max(requestedCategoryPage - 1, 1),
                }),
                nextHref: sidebarPageHref({
                  categoryPage: requestedCategoryPage + 1,
                }),
                hasPrevious: hasPreviousCategoryPage,
                hasNext: hasNextCategoryPage,
                label: `Category page ${requestedCategoryPage}`,
              }}
            />
            <FilterGroup
              title="Brands"
              emptyText="Brands will appear after Mustang products are imported."
              items={visibleBrands.map((brand) => ({
                href: `/parts?brand=${brand.slug}`,
                label: brand.name,
                active: selectedBrand === brand.slug,
              }))}
              controls={{
                previousHref: sidebarPageHref({
                  brandPage: Math.max(requestedBrandPage - 1, 1),
                }),
                nextHref: sidebarPageHref({
                  brandPage: requestedBrandPage + 1,
                }),
                hasPrevious: hasPreviousBrandPage,
                hasNext: hasNextBrandPage,
                label: `Brand page ${requestedBrandPage}`,
              }}
            />
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                  {totalProducts === 0
                    ? "0 results"
                    : `${resultStart}-${resultEnd} of ${totalProducts} results`}
                </p>
                <h2 className="text-2xl font-black text-zinc-950">
                  Catalog results
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {totalPages > 1 ? (
                  <CompactPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageHref={pageHref}
                  />
                ) : null}
                <a
                  href="/parts"
                  className="text-sm font-black uppercase tracking-wide text-red-700 hover:text-red-900"
                >
                  Clear filters
                </a>
              </div>
            </div>
            <ProductGrid products={products} />
            {totalPages > 1 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageHref={pageHref}
              />
            ) : null}
          </section>
        </div>

        <div className="mt-14">
          <CatalogLinks
            emptyText="Seed categories to show additional browsing paths."
            items={visibleCategories.slice(0, 6).map((category) => ({
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
  controls,
}: {
  title: string;
  emptyText: string;
  items: Array<{ href: string; label: string; active?: boolean }>;
  controls?: {
    previousHref: string;
    nextHref: string;
    hasPrevious: boolean;
    hasNext: boolean;
    label: string;
  };
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
          {title}
        </h2>
        {controls ? (
          <div className="flex items-center gap-1" aria-label={controls.label}>
            <FilterPageLink
              href={controls.previousHref}
              disabled={!controls.hasPrevious}
              label={`Previous ${title.toLowerCase()} page`}
            >
              ←
            </FilterPageLink>
            <FilterPageLink
              href={controls.nextHref}
              disabled={!controls.hasNext}
              label={`Next ${title.toLowerCase()} page`}
            >
              →
            </FilterPageLink>
          </div>
        ) : null}
      </div>
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

function FilterPageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const className =
    "grid size-8 place-items-center rounded border text-base font-black leading-none";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={`${className} border-zinc-200 text-zinc-300`}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      aria-label={label}
      className={`${className} border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-950`}
    >
      {children}
    </a>
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function generationFilterLabel(generation: {
  name: string;
  startYear: number;
  endYear: number | null;
}) {
  const startYear = shortYear(generation.startYear);
  const endYear = generation.endYear
    ? shortYear(generation.endYear)
    : "and up";
  return `${generation.name} ${startYear}-${endYear}`.replace("-and up", " and up");
}

function shortYear(year: number) {
  return String(year).slice(-2);
}

function pageParam(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value) ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function partsHref({
  brand,
  category,
  generation,
  query,
  page,
  brandPage,
  categoryPage,
}: {
  brand?: string;
  category?: string;
  generation?: string;
  query?: string;
  page: number;
  brandPage?: number;
  categoryPage?: number;
}) {
  const params = new URLSearchParams();
  if (brand) {
    params.set("brand", brand);
  }
  if (category) {
    params.set("category", category);
  }
  if (generation) {
    params.set("generation", generation);
  }
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (brandPage && brandPage > 1) {
    params.set("brandPage", String(brandPage));
  }
  if (categoryPage && categoryPage > 1) {
    params.set("categoryPage", String(categoryPage));
  }
  const queryString = params.toString();
  return queryString ? `/parts?${queryString}` : "/parts";
}

function Pagination({
  currentPage,
  totalPages,
  pageHref,
}: {
  currentPage: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  const pages = visiblePages(currentPage, totalPages);
  return (
    <nav
      aria-label="Catalog pages"
      className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-5"
    >
      <PageLink
        href={pageHref(Math.max(currentPage - 1, 1))}
        disabled={currentPage <= 1}
      >
        Previous
      </PageLink>
      <div className="flex flex-wrap justify-center gap-2">
        {pages.map((page) => (
          <PageLink
            key={page}
            href={pageHref(page)}
            active={page === currentPage}
          >
            {page}
          </PageLink>
        ))}
      </div>
      <PageLink
        href={pageHref(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage >= totalPages}
      >
        Next
      </PageLink>
    </nav>
  );
}

function CompactPagination({
  currentPage,
  totalPages,
  pageHref,
}: {
  currentPage: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  return (
    <nav
      aria-label="Catalog page controls"
      className="flex items-center gap-2 rounded border border-zinc-200 bg-white p-1"
    >
      <PageLink
        href={pageHref(Math.max(currentPage - 1, 1))}
        disabled={currentPage <= 1}
        compact
      >
        Previous
      </PageLink>
      <span className="px-2 text-sm font-bold text-zinc-700">
        Page {currentPage} of {totalPages}
      </span>
      <PageLink
        href={pageHref(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage >= totalPages}
        compact
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  active = false,
  compact = false,
  disabled = false,
  children,
}: {
  href: string;
  active?: boolean;
  compact?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        className={[
          "rounded border border-zinc-200 text-sm font-bold uppercase tracking-wide text-zinc-400",
          compact ? "px-2 py-1" : "px-3 py-2",
        ].join(" ")}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "rounded border text-sm font-bold uppercase tracking-wide",
        compact ? "px-2 py-1" : "px-3 py-2",
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950",
      ].join(" ")}
    >
      {children}
    </a>
  );
}

function visiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  return Array.from(
    { length: end - adjustedStart + 1 },
    (_, index) => adjustedStart + index,
  );
}

import type { Metadata } from "next";
import { PageHeading } from "@/components/catalog/page-heading";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Products | MustangMagic.store",
  description:
    "Browse MustangMagic.store products imported from the Supabase catalog.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts({ limit: 48 });

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-8">
          <PageHeading
            eyebrow="Products"
            title="Mustang parts catalog"
            description="Browse the first synced product records from Supabase. Search and filters will be added after the catalog structure is stable."
          />
        </div>

        <ProductGrid
          products={products}
          emptyTitle="No products available"
          emptyText="Add catalog products, then activate records to populate this page."
        />
      </div>
    </main>
  );
}

import type { ProductListItem } from "@/types/catalog";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductListItem[];
  emptyTitle?: string;
  emptyText?: string;
};

export function ProductGrid({
  products,
  emptyTitle = "No products found",
  emptyText = "Add catalog products to populate this view.",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
        <h2 className="text-xl font-black text-zinc-950">{emptyTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

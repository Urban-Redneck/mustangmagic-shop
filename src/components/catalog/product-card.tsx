import Link from "next/link";
import type { ProductListItem } from "@/types/catalog";

type ProductCardProps = {
  product: ProductListItem;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group grid overflow-hidden rounded border border-zinc-200 bg-white transition hover:border-zinc-400 hover:shadow-sm"
    >
      <div className="aspect-[4/3] bg-zinc-100">
        {product.primaryImageUrl ? (
          <div
            aria-label={product.name}
            className="h-full w-full bg-contain bg-center bg-no-repeat transition group-hover:scale-[1.02]"
            style={{ backgroundImage: `url(${product.primaryImageUrl})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#18181b_0%,#3f3f46_58%,#b91c1c_100%)] px-6 text-center text-sm font-black uppercase tracking-[0.16em] text-white">
            MustangMagic
          </div>
        )}
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">
            {product.brandName ?? "Performance Part"}
          </p>
          <h2 className="mt-2 line-clamp-2 text-base font-bold leading-6 text-zinc-950">
            {product.name}
          </h2>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs font-semibold text-zinc-500">
            Part #{product.partNumber}
          </p>
          <p className="text-base font-black text-zinc-950">
            {formatPrice(product.price)}
          </p>
        </div>
        <p className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">
          {formatInventory(product.inventoryStatus)}
        </p>
      </div>
    </Link>
  );
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Call";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function formatInventory(status: string) {
  return status.replaceAll("_", " ");
}

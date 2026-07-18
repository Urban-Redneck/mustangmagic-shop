import Image from "next/image";
import Link from "next/link";
import type { ProductListItem } from "@/types/catalog";

type ProductCardProps = {
  product: ProductListItem;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group grid overflow-hidden rounded border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:border-red-700 hover:shadow-[0_12px_30px_rgb(24_24_27_/_0.12)]"
    >
      <div className="relative aspect-[4/3] border-b border-zinc-200 bg-[radial-gradient(circle_at_50%_20%,#ffffff_0%,#f4f4f5_48%,#e4e4e7_100%)]">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="object-contain p-3 transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="mm-carbon flex h-full w-full items-center justify-center px-6 text-center text-sm font-black uppercase tracking-[0.16em] text-yellow-300">
            MustangMagic
          </div>
        )}
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">
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
        <p className="w-fit rounded bg-zinc-950 px-2 py-1 text-xs font-black uppercase tracking-wide text-yellow-300">
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
  if (status === "special_order" || status === "unknown") {
    return "Call for availability";
  }

  return status.replaceAll("_", " ");
}

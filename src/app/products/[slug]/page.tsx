import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { getProductBySlug, getProductSlugs } from "@/lib/catalog/queries";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | MustangMagic.store",
    };
  }

  return {
    title: `${product.name} | MustangMagic.store`,
    description:
      product.shortDescription ??
      `${product.brandName ?? "Mustang"} part ${product.partNumber}`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const galleryImages =
    product.images.length > 0
      ? product.images
      : product.primaryImageUrl
        ? [
            {
              id: "primary",
              url: product.primaryImageUrl,
              altText: product.name,
              width: null,
              height: null,
              isPrimary: true,
            },
          ]
        : [];
  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <Link
          href="/parts"
          className="text-sm font-black uppercase tracking-wide text-red-700 hover:text-red-900"
        >
          Back to parts
        </Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <ProductGallery images={galleryImages} productName={product.name} />

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
              {product.brandName ?? "Performance Part"}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-sm font-bold uppercase tracking-wide text-zinc-500">
              Part #{product.partNumber}
            </p>
            {product.shortDescription ? (
              <p className="mt-5 text-lg leading-8 text-zinc-700">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-8 grid gap-3 border-y border-zinc-200 py-6 sm:grid-cols-3">
              <Fact label="Price" value={formatPrice(product.price)} />
              <Fact label="MAP" value={formatPrice(product.mapPrice)} />
              <Fact
                label="Availability"
                value={formatInventoryStatus(product.inventoryStatus)}
              />
            </div>

            <div className="mt-6 rounded border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Purchase status
              </h2>
              {canStartCheckout(
                product.price,
                product.inventoryStatus,
                product.canPurchase,
              ) ? (
                <form action="/api/cart" method="post" className="mt-4 grid gap-4">
                  <input type="hidden" name="action" value="add" />
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="returnTo" value="/cart" />
                  <label className="grid gap-2 text-sm font-bold text-zinc-700">
                    Quantity
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      max="10"
                      defaultValue="1"
                      className="h-11 w-24 rounded border border-zinc-300 bg-white px-3 text-base font-semibold text-zinc-950"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex w-fit rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
                  >
                    Add to cart
                  </button>
                  <p className="text-xs leading-5 text-zinc-500">
                    Your cart stores only product IDs and quantities. Price and
                    availability are revalidated on the server before Stripe
                    checkout opens.
                  </p>
                </form>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  This product is not available for online checkout right now.
                  Contact Mustang Magic for current price and availability.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="grid gap-6">
            <div className="rounded border border-zinc-200 bg-white p-6">
              <h2 className="text-2xl font-black text-zinc-950">Details</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-700">
                {product.description ??
                  "Detailed product copy will appear here after this catalog item is updated."}
              </p>
            </div>

            {product.shopNotes ? (
              <div className="rounded border border-zinc-200 bg-white p-6">
                <h2 className="text-2xl font-black text-zinc-950">
                  Mustang Magic notes
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Fact
                    label="Recommended"
                    value={product.shopNotes.recommended ? "Yes" : "No"}
                  />
                  <Fact
                    label="Tune Required"
                    value={product.shopNotes.tuneRequired ? "Yes" : "No"}
                  />
                  <Fact
                    label="Labor"
                    value={formatLaborHours(product.shopNotes.laborHours)}
                  />
                  <Fact
                    label="Difficulty"
                    value={formatDifficulty(product.shopNotes.difficulty)}
                  />
                  {product.shopNotes.horsepowerGain !== null ? (
                    <Fact
                      label="Horsepower"
                      value={`+${product.shopNotes.horsepowerGain} hp`}
                    />
                  ) : null}
                  {product.shopNotes.torqueGain !== null ? (
                    <Fact
                      label="Torque"
                      value={`+${product.shopNotes.torqueGain} lb-ft`}
                    />
                  ) : null}
                </div>
                {product.shopNotes.shopNotes ? (
                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-700">
                    {product.shopNotes.shopNotes}
                  </p>
                ) : null}
              </div>
            ) : null}

            {product.installTips.length > 0 ? (
              <div className="rounded border border-zinc-200 bg-white p-6">
                <h2 className="text-2xl font-black text-zinc-950">
                  Install tips
                </h2>
                <ol className="mt-4 grid gap-3">
                  {product.installTips.map((tip, index) => (
                    <li
                      key={tip.id}
                      className="flex gap-3 border-b border-zinc-100 pb-3 text-sm leading-6 text-zinc-700 last:border-b-0 last:pb-0"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs font-black text-zinc-700">
                        {index + 1}
                      </span>
                      <span>{tip.tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6">
            <div className="rounded border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Categories
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.categories.length > 0 ? (
                  product.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/parts?category=${category.slug}`}
                      className="rounded bg-zinc-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-700 hover:bg-zinc-200"
                    >
                      {category.name}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No categories synced.</p>
                )}
              </div>
            </div>

            <div className="rounded border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Fitment
              </h2>
              <div className="mt-4 grid gap-3">
                {product.fitments.length > 0 ? (
                  product.fitments.slice(0, 12).map((fitment) => (
                    <div
                      key={`${fitment.year}-${fitment.trim}-${fitment.engine}`}
                      className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <p className="font-bold text-zinc-950">
                        {fitment.year} {fitment.generationName ?? "Mustang"}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {[fitment.trim, fitment.engine, fitment.notes]
                          .filter(Boolean)
                          .join(" · ") || "Mustang fitment"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No fitment synced.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black capitalize text-zinc-950">{value}</p>
    </div>
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

function formatInventoryStatus(status: string) {
  if (status === "special_order" || status === "unknown") {
    return "Call for availability";
  }

  return status.replaceAll("_", " ");
}

function canStartCheckout(
  price: number | null,
  inventoryStatus: string,
  canPurchase: boolean,
) {
  return (
    canPurchase &&
    price !== null &&
    price > 0 &&
    ["in_stock", "low_stock"].includes(inventoryStatus)
  );
}

function formatLaborHours(hours: number | null) {
  if (hours === null) {
    return "Call";
  }

  const label = Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1);
  return `${label} ${hours === 1 ? "hour" : "hours"}`;
}

function formatDifficulty(difficulty: number | null) {
  if (difficulty === null) {
    return "Call";
  }

  return `${difficulty} ${difficulty === 1 ? "wrench" : "wrenches"}`;
}

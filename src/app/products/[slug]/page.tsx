import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog/queries";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

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
          <div className="overflow-hidden rounded border border-zinc-200 bg-white">
            <div className="aspect-[4/3] bg-zinc-100">
              {product.primaryImageUrl ? (
                <div
                  aria-label={product.name}
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${product.primaryImageUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#18181b_0%,#3f3f46_58%,#b91c1c_100%)] px-6 text-center text-sm font-black uppercase tracking-[0.16em] text-white">
                  MustangMagic
                </div>
              )}
            </div>
          </div>

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
                value={product.inventoryStatus.replaceAll("_", " ")}
              />
            </div>

            <div className="mt-6 rounded border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Purchase status
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Checkout is not enabled yet. Product pricing and availability
                are displayed from the synced catalog and will be validated
                server-side before future checkout.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="rounded border border-zinc-200 bg-white p-6">
            <h2 className="text-2xl font-black text-zinc-950">Details</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-700">
              {product.description ??
                "Detailed product copy will appear here after the Turn14 importer syncs this product description."}
            </p>
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

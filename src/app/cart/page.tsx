import Link from "next/link";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";

export const metadata = {
  title: "Cart | MustangMagic.store",
  description: "Review selected Mustang parts before Stripe checkout.",
};

export default async function CartPage() {
  const cartItems = await getCartItems();
  const products = await getCheckoutProductsByIds(
    cartItems.map((item) => item.productId),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const rows = cartItems.map((item) => ({
    item,
    product: productById.get(item.productId) ?? null,
  }));
  const purchasableRows = rows.filter(
    (row) => row.product && row.product.canPurchase,
  );
  const subtotal = purchasableRows.reduce(
    (sum, row) => sum + (row.product?.price ?? 0) * row.item.quantity,
    0,
  );
  const canCheckout = rows.length > 0 && purchasableRows.length === rows.length;

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
              Cart
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              Review selected parts
            </h1>
          </div>
          <Link
            href="/parts"
            className="text-sm font-black uppercase tracking-wide text-red-700 hover:text-red-900"
          >
            Continue shopping
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-10 border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-black text-zinc-950">
              Your cart is empty
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
              Add priced catalog items to review them together before checkout.
            </p>
            <Link
              href="/parts"
              className="mt-6 inline-flex rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
            >
              Browse parts
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div className="grid gap-4">
              {rows.map(({ item, product }) => (
                <div
                  key={item.productId}
                  className="grid gap-4 border border-zinc-200 bg-white p-4 sm:grid-cols-[7rem_1fr] sm:items-start"
                >
                  <div className="aspect-[4/3] bg-zinc-100">
                    {product?.primaryImageUrl ? (
                      <div
                        aria-label={product.name}
                        className="h-full w-full bg-contain bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${product.primaryImageUrl})`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-950 px-3 text-center text-xs font-black uppercase tracking-wide text-white">
                        MustangMagic
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      {product ? (
                        <>
                          <Link
                            href={`/products/${product.slug}`}
                            className="text-lg font-black text-zinc-950 hover:text-red-700"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Part #{product.partNumber}
                          </p>
                          <p className="mt-3 text-sm text-zinc-600">
                            {product.canPurchase
                              ? `${formatPrice(product.price)} each`
                              : "Not available for online checkout right now."}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-black text-zinc-950">
                            Product unavailable
                          </p>
                          <p className="mt-3 text-sm text-zinc-600">
                            This cart item no longer exists in the active
                            catalog.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="grid gap-3 sm:min-w-36">
                      <form action="/api/cart" method="post" className="flex gap-2">
                        <input type="hidden" name="action" value="update" />
                        <input
                          type="hidden"
                          name="productId"
                          value={item.productId}
                        />
                        <input type="hidden" name="returnTo" value="/cart" />
                        <input
                          type="number"
                          name="quantity"
                          min="1"
                          max="10"
                          defaultValue={item.quantity}
                          className="h-10 w-20 rounded border border-zinc-300 px-3 text-sm font-semibold"
                        />
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-3 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
                        >
                          Update
                        </button>
                      </form>
                      <form action="/api/cart" method="post">
                        <input type="hidden" name="action" value="remove" />
                        <input
                          type="hidden"
                          name="productId"
                          value={item.productId}
                        />
                        <input type="hidden" name="returnTo" value="/cart" />
                        <button
                          type="submit"
                          className="text-xs font-black uppercase tracking-wide text-red-700 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Summary
              </h2>
              <div className="mt-5 grid gap-3 border-y border-zinc-200 py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600">Items</span>
                  <span className="font-bold text-zinc-950">
                    {purchasableRows.reduce(
                      (sum, row) => sum + row.item.quantity,
                      0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-black text-zinc-950">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>
              {!canCheckout ? (
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  Remove unavailable items before checkout. Prices and
                  availability are checked again on the server.
                </p>
              ) : null}
              {canCheckout ? (
                <Link
                  href="/checkout/address"
                  className="mt-5 flex w-full justify-center rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
                >
                  Checkout cart
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full rounded bg-zinc-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-white disabled:cursor-not-allowed"
                >
                  Checkout cart
                </button>
              )}
              <form action="/api/cart" method="post" className="mt-3">
                <input type="hidden" name="action" value="clear" />
                <input type="hidden" name="returnTo" value="/cart" />
                <button
                  type="submit"
                  className="w-full rounded border border-zinc-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
                >
                  Clear cart
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

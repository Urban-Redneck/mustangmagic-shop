import Link from "next/link";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";
import {
  discountedUnitAmountCents,
  getAppliedDiscount,
  type AppliedDiscount,
} from "@/lib/discounts/server";

export const metadata = {
  title: "Shopping Cart",
  description: "Review selected Mustang parts before contacting the shop.",
};

type CartPageProps = {
  searchParams: Promise<{
    discount?: string;
    discountError?: string;
  }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const [{ discount, discountError }, cartItems, appliedDiscount] = await Promise.all([
    searchParams,
    getCartItems(),
    getAppliedDiscount(),
  ]);
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
  const discountSummary = calculateCartDiscount(purchasableRows, appliedDiscount);
  const estimatedTotal = discountSummary?.subtotalAfterDiscount ?? subtotal;
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
              Add priced catalog items to review them together before contacting
              the shop.
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
                              : "Call for current price and availability."}
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
                {discountSummary ? (
                  <div className="flex justify-between gap-4 text-red-700">
                    <span>
                      Discount ({discountSummary.code}, {discountSummary.label})
                    </span>
                    <span className="font-black">
                      -{formatPrice(discountSummary.amount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3">
                  <span className="font-bold text-zinc-700">
                    Estimated before shipping
                  </span>
                  <span className="font-black text-zinc-950">
                    {formatPrice(estimatedTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-5 border-b border-zinc-200 pb-5">
                {appliedDiscount ? (
                  <form action="/api/discount" method="post" className="grid gap-2">
                    <input type="hidden" name="action" value="clear" />
                    <input type="hidden" name="returnTo" value="/cart" />
                    <p className="text-sm font-bold text-zinc-700">
                      Code {appliedDiscount.code} is applied.
                    </p>
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
                    >
                      Remove discount
                    </button>
                  </form>
                ) : (
                  <form action="/api/discount" method="post" className="grid gap-2">
                    <input type="hidden" name="action" value="apply" />
                    <input type="hidden" name="returnTo" value="/cart" />
                    <label
                      htmlFor="discountCode"
                      className="text-sm font-bold text-zinc-700"
                    >
                      Discount code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="discountCode"
                        name="discountCode"
                        placeholder="Code"
                        className="min-h-10 min-w-0 flex-1 rounded border border-zinc-300 px-3 text-sm font-semibold uppercase text-zinc-950 outline-none focus:border-red-700"
                      />
                      <button
                        type="submit"
                        className="rounded bg-zinc-950 px-3 text-xs font-black uppercase tracking-wide text-white hover:bg-zinc-800"
                      >
                        Apply
                      </button>
                    </div>
                  </form>
                )}
                {discount === "applied" ? (
                  <p className="text-sm font-bold text-green-700">
                    Discount code applied.
                  </p>
                ) : null}
                {discountError === "invalid" ? (
                  <p className="text-sm font-bold text-red-700">
                    That discount code is not valid.
                  </p>
                ) : null}
              </div>
              {!canCheckout ? (
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  Remove unavailable items before requesting an order. Prices and
                  availability are checked again on the server.
                </p>
              ) : null}
              <a
                href="tel:+16312543430"
                className="mt-5 flex w-full justify-center rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
              >
                Call to order: (631) 254-3430
              </a>
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

function calculateCartDiscount(
  rows: Array<{
    item: { quantity: number };
    product: {
      price: number;
      purchaseCost: number;
    } | null;
  }>,
  appliedDiscount: AppliedDiscount | null,
) {
  if (!appliedDiscount) {
    return null;
  }

  const subtotalCents = rows.reduce((sum, row) => {
    if (!row.product) {
      return sum;
    }
    return sum + dollarsToCents(row.product.price) * row.item.quantity;
  }, 0);
  const discountedSubtotalCents = rows.reduce((sum, row) => {
    if (!row.product) {
      return sum;
    }
    return (
      sum +
      discountedUnitAmountCents(
        dollarsToCents(row.product.price),
        appliedDiscount,
        dollarsToCents(row.product.purchaseCost),
      ) *
        row.item.quantity
    );
  }, 0);
  const discountAmountCents = Math.max(
    subtotalCents - discountedSubtotalCents,
    0,
  );

  if (discountAmountCents <= 0) {
    return null;
  }

  return {
    ...appliedDiscount,
    amount: discountAmountCents / 100,
    subtotalAfterDiscount: discountedSubtotalCents / 100,
  };
}

function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

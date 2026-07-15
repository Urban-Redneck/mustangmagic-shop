import Link from "next/link";
import { getCartItems } from "@/lib/cart/server";
import { getCheckoutProductsByIds } from "@/lib/checkout/products";

export const metadata = {
  title: "Checkout Address | MustangMagic.store",
  description: "Add billing and shipping details before payment.",
};

type AddressPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CheckoutAddressPage({
  searchParams,
}: AddressPageProps) {
  const [{ error }, cartItems] = await Promise.all([
    searchParams,
    getCartItems(),
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
  const canCheckout = rows.length > 0 && purchasableRows.length === rows.length;
  const subtotal = purchasableRows.reduce(
    (sum, row) => sum + (row.product?.price ?? 0) * row.item.quantity,
    0,
  );

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
              Checkout
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
              Address details
            </h1>
          </div>
          <Link
            href="/cart"
            className="text-sm font-black uppercase tracking-wide text-red-700 hover:text-red-900"
          >
            Back to cart
          </Link>
        </div>

        {error ? (
          <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        {!canCheckout ? (
          <div className="mt-10 border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-black text-zinc-950">
              Checkout is not ready
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
              Return to the cart and remove unavailable items before payment.
            </p>
            <Link
              href="/cart"
              className="mt-6 inline-flex rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
            >
              Review cart
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
            <form
              action="/api/checkout/address"
              method="post"
              className="grid gap-6"
            >
              <section className="border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                  Contact
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextField label="Full name" name="contact_name" required />
                  <TextField
                    label="Email"
                    name="contact_email"
                    type="email"
                    required
                  />
                  <TextField
                    label="Phone"
                    name="contact_phone"
                    type="tel"
                    required
                  />
                </div>
              </section>

              <section className="border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                  Shipping
                </h2>
                <AddressFields prefix="shipping" />
              </section>

              <section className="border border-zinc-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                    Billing
                  </h2>
                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                    <input
                      type="checkbox"
                      name="billing_same_as_shipping"
                      value="true"
                      defaultChecked
                      className="h-4 w-4 accent-red-700"
                    />
                    Use shipping address
                  </label>
                </div>
                <AddressFields prefix="billing" required={false} />
              </section>

              <section className="border border-zinc-200 bg-white p-5">
                <label className="flex items-start gap-3 text-sm font-bold leading-6 text-zinc-700">
                  <input
                    type="checkbox"
                    name="acknowledge_compliance"
                    value="true"
                    required
                    className="mt-1 h-4 w-4 shrink-0 accent-red-700"
                  />
                  I acknowledge any required Prop 65, EPA, and CARB notices for
                  the parts in this order.
                </label>
              </section>

              <section className="border border-zinc-200 bg-white p-5">
                <label className="flex items-start gap-3 text-sm font-bold leading-6 text-zinc-700">
                  <input
                    type="checkbox"
                    name="marketing_opt_in"
                    value="true"
                    className="mt-1 h-4 w-4 shrink-0 accent-red-700"
                  />
                  Email me Mustang Magic product updates, specials, and event
                  news. I can unsubscribe at any time.
                </label>
              </section>

              <button
                type="submit"
                className="rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
              >
                Continue to payment
              </button>
            </form>

            <aside className="h-fit border border-zinc-200 bg-white p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-950">
                Summary
              </h2>
              <div className="mt-5 grid gap-4">
                {purchasableRows.map(({ item, product }) => (
                  <div
                    key={item.productId}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-bold text-zinc-950">
                        {product?.name}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        {product?.partNumber} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-black text-zinc-950">
                      {formatPrice((product?.price ?? 0) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-zinc-200 pt-5">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-black text-zinc-950">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function AddressFields({
  prefix,
  required = true,
}: {
  prefix: "shipping" | "billing";
  required?: boolean;
}) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <TextField label="Company" name={`${prefix}_company`} />
      <TextField label="Address" name={`${prefix}_address`} required={required} />
      <TextField label="Address 2" name={`${prefix}_address_2`} />
      <TextField label="City" name={`${prefix}_city`} required={required} />
      <TextField
        label="State"
        name={`${prefix}_state`}
        required={required}
        maxLength={2}
      />
      <TextField label="ZIP" name={`${prefix}_zip`} required={required} />
      <TextField
        label="Country"
        name={`${prefix}_country`}
        required={required}
        defaultValue="US"
        maxLength={2}
      />
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-zinc-700">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="rounded border border-zinc-300 bg-white px-3 py-2 text-base font-medium text-zinc-950 outline-none focus:border-red-700"
      />
    </label>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

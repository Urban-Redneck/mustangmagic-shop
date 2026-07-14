import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="border border-zinc-200 bg-white p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
            Checkout
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
            Checkout was not completed
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            No payment was captured. You can return to the catalog and try
            again.
          </p>
          {reason ? (
            <p className="mt-5 rounded bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-600">
              {reason}
            </p>
          ) : null}
          <Link
            href="/parts"
            className="mt-8 inline-flex rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
          >
            Browse parts
          </Link>
        </div>
      </div>
    </main>
  );
}

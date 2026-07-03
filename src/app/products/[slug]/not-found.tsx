import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h1 className="text-3xl font-black text-zinc-950">
            Product not found
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            This product is not active in the current Supabase catalog.
          </p>
          <Link
            href="/parts"
            className="mt-6 inline-flex rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800"
          >
            Browse parts
          </Link>
        </div>
      </div>
    </main>
  );
}

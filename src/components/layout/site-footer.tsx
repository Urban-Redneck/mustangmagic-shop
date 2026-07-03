export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm sm:grid-cols-3 lg:px-8">
        <div>
          <p className="font-semibold text-white">MustangMagic.store</p>
          <p className="mt-2 max-w-sm text-zinc-400">
            Curated Mustang parts catalog powered by Supabase and Turn14 product
            data.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Catalog</p>
          <p className="mt-2 text-zinc-400">
            Browse by generation, brand, category, or part number.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Status</p>
          <p className="mt-2 text-zinc-400">
            Checkout is intentionally not enabled in this phase.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function ProductsLoading() {
  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="max-w-3xl">
          <div className="h-4 w-28 rounded bg-zinc-200" />
          <div className="mt-4 h-12 w-full max-w-xl rounded bg-zinc-200" />
          <div className="mt-4 h-6 w-full max-w-2xl rounded bg-zinc-200" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded border border-zinc-200 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-zinc-200" />
              <div className="grid gap-3 p-4">
                <div className="h-3 w-24 rounded bg-zinc-200" />
                <div className="h-5 w-full rounded bg-zinc-200" />
                <div className="h-5 w-4/5 rounded bg-zinc-200" />
                <div className="flex items-end justify-between gap-3">
                  <div className="h-3 w-28 rounded bg-zinc-200" />
                  <div className="h-5 w-16 rounded bg-zinc-200" />
                </div>
                <div className="h-6 w-24 rounded bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

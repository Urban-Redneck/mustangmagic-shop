import Link from "next/link";

type CatalogLink = {
  href: string;
  title: string;
  description?: string | null;
  meta?: string;
};

type CatalogLinksProps = {
  items: CatalogLink[];
  emptyText: string;
};

export function CatalogLinks({ items, emptyText }: CatalogLinksProps) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-600">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-black text-zinc-950">{item.title}</h2>
            {item.meta ? (
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">
                {item.meta}
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">
              {item.description}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

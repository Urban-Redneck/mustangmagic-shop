import Link from "next/link";

const navItems = [
  { href: "/parts", label: "Parts" },
  { href: "/brands", label: "Brands" },
  { href: "/generations", label: "Generations" },
  { href: "/search", label: "Search" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-red-700 text-sm font-black text-white">
            MM
          </span>
          <span>
            <span className="block text-lg font-black tracking-wide text-zinc-950">
              MustangMagic.store
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Ford Mustang Parts
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

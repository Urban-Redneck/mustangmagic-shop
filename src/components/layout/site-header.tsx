import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/parts", label: "Shop" },
  { href: "/brands", label: "Brands" },
  { href: "/generations", label: "Generations" },
  { href: "/search", label: "Search" },
  { href: "/cart", label: "Cart" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-yellow-400 text-sm font-black text-zinc-950">
            MM
          </span>
          <span>
            <span className="block text-lg font-black tracking-wide text-white">
              MustangMagic.com
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.18em] text-yellow-300">
              Performance Shop & Parts
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-yellow-300 hover:text-yellow-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

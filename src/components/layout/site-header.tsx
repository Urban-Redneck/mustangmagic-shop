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
    <header className="mm-carbon mm-redline border-b border-zinc-900 text-white">
      <div className="border-b border-white/10 bg-black/55">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="text-yellow-300">
            Coyote Specialists & Dyno Tuning
          </span>
          <span className="text-zinc-400">
            In operation since 1990 - Deer Park, NY -{" "}
            <a className="text-yellow-300 hover:text-yellow-200" href="tel:+16312543430">
              (631) 254-3430
            </a>
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded border border-yellow-300 bg-yellow-400 text-sm font-black text-zinc-950 shadow-[0_0_0_3px_rgb(185_28_28_/_0.35)]">
            MM
          </span>
          <span>
            <span className="block text-xl font-black tracking-wide text-white">
              MustangMagic.com
            </span>
            <span className="block text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Performance Shop & Parts Store
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-white/15 bg-black/25 px-3 py-2 text-sm font-bold text-zinc-100 transition hover:border-yellow-300 hover:bg-yellow-300 hover:text-zinc-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

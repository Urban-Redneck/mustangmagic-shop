export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm sm:grid-cols-3 lg:px-8">
        <div>
          <p className="font-semibold text-white">
            Mustang Magic & American Speed
          </p>
          <p className="mt-2 max-w-sm text-zinc-400">
            Mustang performance services, dyno tuning, installations, and
            curated Mustang parts from Deer Park, New York.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Visit</p>
          <p className="mt-2 text-zinc-400">Deer Park, New York</p>
          <p className="mt-1">
            <a className="text-yellow-300 hover:text-yellow-200" href="tel:+16312543430">
              (631) 254-3430
            </a>
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Shop</p>
          <p className="mt-2 text-zinc-400">
            Browse Mustang parts by generation, brand, category, or part number.
          </p>
        </div>
      </div>
    </footer>
  );
}

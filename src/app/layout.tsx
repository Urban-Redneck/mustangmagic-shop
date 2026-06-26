import type { Metadata } from "next";
import "./globals.css";
import Link from 'next/link';
import CartIcon from '@/components/CartIcon';

export const metadata: Metadata = {
  title: "Mustang Magic & American Speed | Mustang Parts & Performance",
  description: "Long Island's Mustang Performance Specialists since 1990. Dropshipping Mustang parts sourced from Turn 14 Distribution.",
  keywords: "mustang parts, mustang performance, coyote turbo, supercharger, convertible top, suspension, exhaust, deer park ny",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-white">
        {/* Top bar */}
        <div className="bg-zinc-950 text-gray-300 text-sm py-2 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <span>🔧 Coyote Specialists • Dyno Tuning • Forced Induction • E85</span>
            <span>(631) 254-3430 · 160 Brook Ave, Deer Park NY 11729</span>
          </div>
        </div>

        {/* Navbar */}
        <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-red-600 font-black text-xl md:text-2xl tracking-tight">MUSTANG MAGIC</span>
              <span className="hidden sm:inline text-gray-400 font-light text-sm">| American Speed</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="hover:text-red-600 transition-colors font-medium">Home</Link>
              <Link href="/shop" className="hover:text-red-600 transition-colors font-medium">Shop Parts</Link>
              <a href="/contact" className="hover:text-red-600 transition-colors font-medium">Dyno Tuning</a>
              <a href="/contact" className="hover:text-red-600 transition-colors font-medium">Contact</a>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <CartIcon />
              <Link href="/cart" className="hidden md:flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                <span className="font-medium">Cart</span>
              </Link>
            </div>
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="bg-zinc-950 text-gray-400 pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">Mustang Magic</h3>
              <p className="text-sm leading-relaxed mb-4">Long Island's premier Mustang performance shop. Dyno testing, forced induction, and complete builds since 1990.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/shop" className="hover:text-white">Headers & Exhaust</Link></li>
                <li><Link href="/shop" className="hover:text-white">Superchargers</Link></li>
                <li><Link href="/shop" className="hover:text-white">Turbo Kits</Link></li>
                <li><Link href="/shop" className="hover:text-white">Suspension & Gears</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/dyno" className="hover:text-white">Dyno Tuning</a></li>
                <li><a href="#" className="hover:text-white">Remote Tunes</a></li>
                <li><a href="#" className="hover:text-white">E85 Flex Fuel</a></li>
                <li><a href="/contact" className="hover:text-white">Schedule Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Visit Us</h4>
              <p className="text-sm leading-relaxed">
                160 Brook Ave<br />
                Deer Park, NY 11729<br />
                <a href="tel:6312543430" className="text-white hover:text-red-400">(631) 254-3430</a>
              </p>
              <div className="mt-4 text-sm">
                <p className="font-semibold text-gray-300 mb-1">Hours:</p>
                <p>Tue: 10AM–6PM</p>
                <p>Wed: 10AM–8PM</p>
                <p>Thu-Sat: 10AM–6PM</p>
                <p className="text-red-400">Sun-Mon: Closed</p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 border-t border-zinc-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Mustang Magic & American Speed LLC. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

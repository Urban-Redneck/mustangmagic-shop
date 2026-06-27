'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';

type Product = {
  id: string;
  sku: string;
  name: string;
  shortDescription: string;
  price: number;
  mapPrice: number;
  listPrice: number;
  brandName: string;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  inStock: boolean;
  totalInventory?: number;
};

const CATEGORIES = [
  { id: 'all', name: 'All Parts', icon: '' },
  { id: 'headers', name: 'Headers & Exhaust', icon: '🔥' },
  { id: 'intakes', name: 'Intakes', icon: '💨' },
  { id: 'superchargers', name: 'Superchargers', icon: '⚡' },
  { id: 'turbo-kits', name: 'Turbo Kits', icon: '🌀' },
  { id: 'fuel-systems', name: 'Fuel Systems', icon: '⛽' },
  { id: 'suspension-gears', name: 'Suspension & Gears', icon: '🔧' },
  { id: 'engine-components', name: 'Engine Components', icon: '⚙️' },
];

const CATEGORY_KEYWORDS: Record<string, string> = {
  headers: 'headers|exhaust|h-pipe|x-pipe|catback|muffler|tip',
  intakes: 'intake|air aid|cold air',
  superchargers: 'supercharger|whipple|ess|blower',
  'turbo-kits': 'turbo|t45|charge pipe|downpipe|manifold',
  'fuel-systems': 'fuel pump|rail|injector|aeromotive',
  'suspension-gears': 'control arm|spring|coilover|differential|bearing|bmr|eibach|gear|pinion',
  'engine-components': 'clutch|bearing|gasket|oil pump|harmonic|flywheel',
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'kooks-fox', sku: 'KO-KKT-FB', name: "Kooks Long Tube Headers - Foxbody (79-93)", shortDescription: 'HST 2" long tube headers, 1.75" tubes. Made in USA.', price: 895, mapPrice: 895, listPrice: 1045, brandName: 'Kooks', category: 'Headers & Exhaust', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'whipple-62', sku: 'WHL-2-8597', name: 'Whipple 3.5L Supercharger Kit - S197 V8 (05-14)', shortDescription: 'Drop-in bolt-on supercharger, 150hp gain verified on dyno.', price: 3495, mapPrice: 3495, listPrice: 3899, brandName: 'Whipple', category: 'Superchargers', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'ess-gen3', sku: 'ESS-TS1-1900', name: 'ESS Tune-Spec Gen III Supercharger - S550 (15-23)', shortDescription: 'Whipple-based Eaton TVS 2300 blower for S550 GT.', price: 3895, mapPrice: 3895, listPrice: 4295, brandName: 'Eaton/ESS', category: 'Superchargers', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'tomei-t45', sku: 'TM-T45-ST', name: 'Tomei Type-R T45 Turbo System - Mustang GT (15-23)', shortDescription: 'Complete turbo kit with HKS wastegate, charge pipes.', price: 4295, mapPrice: 4295, listPrice: 4795, brandName: 'Tomei', category: 'Turbo Kits', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'ss-exhaust', sku: 'SS-EHT-SV', name: 'Stainless Works Cat-Back Exhaust - SVT/BOSS (01-04)', shortDescription: 'Full stainless steel cat-back system with quad tips.', price: 1249, mapPrice: 1249, listPrice: 1399, brandName: 'Stainless Works', category: 'Headers & Exhaust', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'fuel-pump', sku: 'AER-FP525', name: 'Aeromotive 340 LPH Fuel Pump - E85 Compatible', shortDescription: 'High-flow fuel pump for turbo/supercharged Mustangs.', price: 329, mapPrice: 329, listPrice: 379, brandName: 'Aeromotive', category: 'Fuel Systems', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'bhrr-control-arm', sku: 'BH-CR2378', name: 'BMR Control Arm Kit - S197 Front (05-14)', shortDescription: 'Heavy-duty adjustable control arms for S197 Mustang.', price: 389, mapPrice: 389, listPrice: 449, brandName: 'BMR', category: 'Suspension & Gears', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'eibach-coilover', sku: 'EB-PRO-KIT-SV', name: 'Eibach Pro-Kit Coilover Set - S550 (15-23)', shortDescription: 'Adjustable coilover suspension for track and street.', price: 1895, mapPrice: 1895, listPrice: 2195, brandName: 'Eibach', category: 'Suspension & Gears', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'brembo-brake-kit', sku: 'BRM-BB6-SV', name: 'Brembo Big Brake Kit - 6-Piston Front (GT/CS)', shortDescription: '6-piston Brembo caliper kit with drilled rotors.', price: 4595, mapPrice: 4595, listPrice: 5295, brandName: 'Brembo', category: 'Brake Upgrades', imageUrl: '', imageUrls: [], inStock: true },
  { id: 'mtm-gear-kit', sku: 'MTM-KIT-373', name: "MTM Performance Gear Ratio Conversion Kit - 3.73", shortDescription: 'Complete ring & pinion kit for SN95 and S197 rear ends.', price: 695, mapPrice: 695, listPrice: 799, brandName: 'MTM', category: 'Suspension & Gears', imageUrl: '', imageUrls: [], inStock: true },
];

export default function Homepage() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch products from Turn 14 API when category or search changes
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        let keyword = '';
        if (selectedCategory !== 'all' && !searchQuery) {
          keyword = CATEGORY_KEYWORDS[selectedCategory] || '';
        } else if (searchQuery) {
          keyword = searchQuery;
        }

        if (keyword) {
          const res = await fetch(`/api/products?keyword=${encodeURIComponent(keyword)}`);
          const data = await res.json();
          // Only use API results if they actually returned products AND the item has pricing
          const validProducts = (data.products || []).filter((p: any) => p.purchaseCost > 0 || (p.priceLists && p.priceLists.length > 0));
          if (validProducts.length > 0) {
            setProducts(validProducts.slice(0, 20).map((p: any) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              shortDescription: p.shortDescription,
              price: p.price || 0,
              mapPrice: p.mapPrice || 0,
              listPrice: p.listPrice || 0,
              brandName: p.brandName,
              category: p.category,
              imageUrl: p.imageUrl || '',
              imageUrls: [],
              inStock: true,
              totalInventory: p.totalInventory,
            })));
          } else {
            // Fall back to mock products
            setProducts(DEFAULT_PRODUCTS);
          }
        } else {
          // Default: show mock products (all are verified Ford Mustang compatible)
          setProducts(DEFAULT_PRODUCTS);
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
        setProducts(DEFAULT_PRODUCTS);
      }
      setLoading(false);
    }
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  // Filter by category keyword and search
  let filtered = products.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q);
    }
    if (selectedCategory !== 'all') {
      const catKw = CATEGORY_KEYWORDS[selectedCategory];
      if (!catKw) return true;
      return new RegExp(catKw, 'i').test(`${p.name} ${p.shortDescription} ${p.category}`);
    }
    return true;
  });

  // Only show in-stock products (all mock products are inStock=true)
  filtered = filtered.filter(p => p.inStock);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://mustangmagic.com/wp-content/uploads/2026/06/Mustang2024GT.png')" }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <p className="text-yellow-400 font-semibold tracking-[0.3em] uppercase text-sm mb-4">In Operation Since 1990</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Long Island's Mustang<br />Performance Specialists
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Coyote Specialists • Dyno Tuning • Forced Induction • E85 • Headers • Fuel Systems • Suspension
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#shop" className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-colors">
              Shop Performance Parts
            </a>
            <a href="/contact" className="border-2 border-white text-white hover:bg-white hover:text-black font-bold py-4 px-10 rounded-lg text-lg transition-colors">
              Schedule Service
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-zinc-900 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-12 text-white text-center">
          <div>
            <p className="text-yellow-400 font-bold text-3xl">Since 1990</p>
            <p className="text-gray-400 text-sm mt-1">In Business</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-3xl">600+ HP</p>
            <p className="text-gray-400 text-sm mt-1">Dyno Verified Builds</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-3xl">Fox-S650</p>
            <p className="text-gray-400 text-sm mt-1">Every Generation</p>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section id="shop" className="py-20 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Shop Performance Parts</h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">Performance upgrades, dyno tuning, and complete Mustang builds.</p>

        {/* Category filter pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2 rounded-full font-semibold transition-colors ${selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Parts
          </button>
          {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`px-5 py-2 rounded-full font-semibold transition-colors ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12">
          <input
            type="text"
            placeholder="Search parts, brands, descriptions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border-2 border-gray-200 rounded-lg focus:border-red-600 focus:outline-none text-lg"
          />
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Loading parts...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xl">No products match your filters. Try clearing them.</div>
        )}
      </section>

      {/* Featured Builds */}
      <section className="bg-zinc-950 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Recent Dyno Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: '2021 Mach 1', desc: 'ESS Supercharger Install', power: '>650 WHP', fuel: '93 Octane' },
              { title: '2007 Mustang GT', desc: 'Turbo Firebreather Tune', power: '>700 WHP', fuel: 'E-85' },
              { title: '2022 Shelby GT500', desc: 'Full Build with Mods', power: '>750 WHP', fuel: '93 Octane' },
            ].map((build, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden">
                <img
                  src={i === 2 ? 'https://mustangmagic.com/wp-content/uploads/2026/06/IMG_4373-scaled.jpg' : `https://images.unsplash.com/photo-${['1583121274602-a3e18b286a3', '1619783181371-1d140db43447'][i]}?w=600&q=75`}
                  alt={build.title}
                  className="w-full h-52 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-white font-bold text-xl mb-1">{build.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{build.desc}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500 font-bold text-lg">{build.power}</span>
                    <span className="text-gray-500">{build.fuel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Mustang Magic */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why Mustang Magic?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: '🎯', title: 'Expert Parts Advice', desc: 'We install and dyno-test everything we sell.' },
            { icon: '📊', title: 'Dyno Verified Results', desc: 'Every build is tested. We report real numbers, not claims.' },
            { icon: '🔧', title: 'Installation Available', desc: 'Drop it off and let our specialists handle the rest.' },
            { icon: '🏎️', title: 'Coyote Specialists', desc: 'Foxbody to S650 — we build, tune, and service every generation.' },
          ].map((item, i) => (
            <div key={i} className="p-6">
              <p className="text-4xl mb-4">{item.icon}</p>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Mustang?</h2>
          <p className="text-xl opacity-90 mb-8">Call us or visit our shop in Deer Park, NY.</p>
          <p className="text-4xl font-bold mb-6">(631) 254-3430</p>
          <a href="#shop" className="bg-white text-red-600 font-bold py-4 px-10 rounded-lg text-lg hover:bg-gray-100 transition-colors inline-block">
            Start Building
          </a>
        </div>
      </section>

      {/* Generations we support */}
      <section className="py-20 max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Mustang Generations We Support</h2>
        <p className="text-gray-500 mb-12">From Foxbody to S650, we build, tune, and service every generation of Mustang.</p>
        <div className="flex flex-wrap justify-center gap-4">
          {['79-93 — Fox Body', '94-04 — SN95', '05-14 — S197', '15-23 — S550', '24+ — S650'].map((g, i) => (
            <span key={i} className="border-2 border-zinc-300 px-8 py-4 rounded-lg font-bold text-xl hover:border-red-600 hover:text-red-600 transition-colors cursor-pointer">
              {g}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

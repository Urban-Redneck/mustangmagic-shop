'use client';

import { useState } from 'react';
import { products, categories, mustangGenerations } from '@/data/mock-products';
import ProductCard from '@/components/ProductCard';
import MMYFilter from '@/components/MMYFilter';

export default function Homepage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products
  let filtered = products;

  if (selectedCategory) {
    filtered = filtered.filter(p => {
      const catMap: Record<string, string[]> = {
        headers: ['Headers'],
        superchargers: ['Superchargers'],
        'turbo-kits': ['Turbo Kits'],
        'fuel-systems': ['Fuel Systems'],
        suspension: ['Suspension', 'Suspension & Gears'],
        brakes: ['Brake Upgrades'],
      };
      return catMap[selectedCategory]?.includes(p.category);
    });
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q)
    );
  }

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
            onClick={() => { setSelectedCategory(null); setFilterYear(''); }}
            className={`px-5 py-2 rounded-full font-semibold transition-colors ${!selectedCategory ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Parts
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
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
        {filtered.length > 0 ? (
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
                  src={i === 2 ? 'https://mustangmagic.com/wp-content/uploads/2026/06/ShelbyGT500-1.jpg' : `https://images.unsplash.com/photo-${['1583121274602-a3e18b286a3', '1619783181371-1d140db43447'][i]}?w=600&q=75`}
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
          {mustangGenerations.map(g => (
            <span key={g.slug} className="border-2 border-zinc-300 px-8 py-4 rounded-lg font-bold text-xl hover:border-red-600 hover:text-red-600 transition-colors cursor-pointer">
              {g.years} — {g.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

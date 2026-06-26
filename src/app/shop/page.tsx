'use client';

import { useState } from 'react';
import { products, categories } from '@/data/mock-products';
import ProductCard from '@/components/ProductCard';

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name' | 'relevance'>('relevance');

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
      const allowed = catMap[selectedCategory] || [];
      return allowed.some(c => c.toLowerCase() === p.category.toLowerCase());
    });
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q)
    );
  }

  if (sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-3">Shop Parts</h1>
        <p className="text-gray-500 mb-12 max-w-xl">Performance parts for every Mustang generation. Expert advice at (631) 254-3430.</p>

        {/* Category filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setSelectedCategory(null)} className={`px-5 py-2 rounded-full font-semibold transition-colors ${!selectedCategory ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'}`}>All</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)} className={`px-5 py-2 rounded-full font-semibold transition-colors ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'}`}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex gap-4 mb-8">
          <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-5 py-3 border rounded-lg bg-white focus:border-red-600 focus:outline-none" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-4 py-3 border rounded-lg bg-white focus:border-red-600 focus:outline-none">
            <option value="relevance">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A-Z</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">{filtered.length} parts found</p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xl">No products match your filters.</div>
        )}
      </div>
    </div>
  );
}

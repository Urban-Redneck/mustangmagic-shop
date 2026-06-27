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
  purchaseCost?: number;
  priceLists?: Array<{name: string; price: number}>;
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
  headers: 'headers|exhaust|h-pipe|x-pipe|catback|pipe|muffler|tip',
  intakes: 'intake|air aid|cold air',
  superchargers: 'supercharger|whipple|ess|tv\w*2300|blower',
  'turbo-kits': 'turbo|t45|charge pipe|downpipe|manifold',
  'fuel-systems': 'fuel pump|rail|injector|aeromotive|fuel delivery',
  'suspension-gears': 'control arm|spring|coilover|differential|bearing|bmr|eibach|gear|pinion',
  'engine-components': 'clutch|bearing|gasket|oil pump|harmonic|flywheel',
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name' | 'relevance'>('relevance');

  // Fetch products from Turn 14 API
  useEffect(() => {
    async function fetchProducts() {
      try {
        // If there's a search query or category, use the API
        const keyword = searchQuery || getCategoryKeyword(selectedCategory);
        if (keyword) {
          const res = await fetch(`/api/products?keyword=${encodeURIComponent(keyword)}`);
          const data = await res.json();
          if (data.products) {
            setProducts(data.products as Product[]);
          }
        } else {
          // No keyword: load mock products from local catalog for browsing
          const defaultProducts: Product[] = [
            { id: 'kooks-fox', sku: 'KO-KKT-FB', name: "Kooks Long Tube Headers - Foxbody (79-93)", shortDescription: 'HST 2" long tube headers, 1.75" tubes, flanged primarys. Made in USA.', price: 895, mapPrice: 895, listPrice: 1045, brandName: 'Kooks', category: 'Headers & Exhaust', imageUrl: '', imageUrls: [], inStock: true },
            { id: 'whipple-62', sku: 'WHL-2-8597', name: 'Whipple 3.5L Supercharger Kit - S197 V8 (05-14)', shortDescription: 'Drop-in bolt-on supercharger, 150hp gain verified on dyno.', price: 3495, mapPrice: 3495, listPrice: 3899, brandName: 'Whipple', category: 'Superchargers', imageUrl: '', imageUrls: [], inStock: true },
            { id: 'ss-exhaust', sku: 'SS-EHT-SV', name: "Stainless Works Cat-Back Exhaust - SVT/BOSS (01-04)", shortDescription: 'Full stainless steel cat-back system with quad tips.', price: 1249, mapPrice: 1249, listPrice: 1399, brandName: 'Stainless Works', category: 'Headers & Exhaust', imageUrl: '', imageUrls: [], inStock: true },
            { id: 'ess-gen3', sku: 'ESS-TS1-1900', name: 'ESS Tune-Spec Gen III Supercharger - S550 (15-23)', shortDescription: 'Whipple-based Eaton TVS 2300 blower for S550 GT.', price: 3895, mapPrice: 3895, listPrice: 4295, brandName: 'Eaton/ESS', category: 'Superchargers', imageUrl: '', imageUrls: [], inStock: true },
            { id: 'tomei-t45', sku: 'TM-T45-ST', name: 'Tomei Type-R T45 Turbo System - Mustang GT (15-23)', shortDescription: 'Complete turbo kit with HKS wastegate, charge pipes, manifold.', price: 4295, mapPrice: 4295, listPrice: 4795, brandName: 'Tomei', category: 'Turbo Kits', imageUrl: '', imageUrls: [], inStock: true },
            { id: 'fuel-pump', sku: 'AER-FP525', name: 'Aeromotive 340 LPH Fuel Pump - E85 Compatible', shortDescription: 'High-flow fuel pump for turbo/supercharged Mustangs. E85 ready.', price: 329, mapPrice: 329, listPrice: 379, brandName: 'Aeromotive', category: 'Fuel Systems', imageUrl: '', imageUrls: [], inStock: true },
          ];
          setProducts(defaultProducts);
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
        setLoading(false);
      }
      setLoading(false);
    }
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  function getCategoryKeyword(cat: string): string {
    const kw = CATEGORY_KEYWORDS[cat];
    return kw || '';
  }

  // Filter by category keyword match
  let filtered = products.filter(p => {
    if (selectedCategory === 'all') return true;
    const catKw = CATEGORY_KEYWORDS[selectedCategory];
    if (!catKw) return true;
    return new RegExp(catKw, 'i').test(`${p.name} ${p.shortDescription} ${p.category}`);
  });

  // Sort
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
          <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2 rounded-full font-semibold transition-colors ${selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'}`}>All</button>
          {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2 rounded-full font-semibold transition-colors ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'}`}>
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
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Loading parts...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xl">No parts match your filters. Try a different category or search.</div>
        )}
      </div>
    </div>
  );
}

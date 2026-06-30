// Product catalog sourced from Turn 14 Distribution API + manual fitment mapping
// No VCDB needed — YMM data is hand-verified per SKU

interface Product {
  id: string;
  sku: string;
  turn14ItemId: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;      // dealer cost (our buy)
  mapPrice: number;   // Turn 14 MAP
  retailPrice: number; // suggested retail
  brandName: string;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  inStock: boolean;
  t14Inventory?: { t14Stock: number; mfrStock: number };
  yearMakeModel: Array<{ year: string; make: string; model: string }>;
}

export const products: Product[] = [

// ─── KEPT (real products with pricing) ──────────────

{
  id: 't14-kooks-hpipe', sku: 'ksh11513500', turn14ItemId: '1025033',
  name: "Kooks Headers Resonator Delete H-Pipe — 15-26 Mustang GT 5.0L",
  shortDescription: 'OEM-fit resonator delete H-pipe for S550/S650 GT. Direct bolt-on.',
  longDescription: 'Kooks Headers OEM Resonator Delete H-Pipe Kit for 2015-2026 Mustang GT 5.0L. This direct replacement connects your downpipes to your catback system with no check-engine lights. T30 stainless construction, OEM-style flanges for easy installation. Dyno-tested for flow — no restrictive baffles.',
  price: 308.78, mapPrice: 397, retailPrice: 441,
  brandName: 'Kooks Headers', category: 'Headers & Exhaust',
  imageUrl: '', imageUrls: [], inStock: true, t14Inventory: { t14Stock: 1, mfrStock: 0 },
  yearMakeModel: [{ year: '2015-2026', make: 'Ford', model: 'Mustang GT' }],
},
{
  id: 't14-bmr-control-arm-coilover', sku: 'bmrAA036H', turn14ItemId: '201248',
  name: "BMR Lower A-Arm w/ Adj. Rod End — Foxbody (79-93)",
  shortDescription: 'Coilover-only lower arms with adjustable rod end. Black Hammertone.',
  longDescription: 'BMR Performance 1979-1993 Mustang Lower Control Arm. Features coilover-compatible design with adjustable rod end and standard ball joint. Eliminates suspension geometry issues from worn OEM arms. Perfect for Foxbody coilover builds. Black Hammertone finish on all exposed surfaces.',
  price: 398.36, mapPrice: 479.95, retailPrice: 479.95,
  brandName: 'BMR Suspension', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true, t14Inventory: { t14Stock: 0, mfrStock: 0 },
  yearMakeModel: [{ year: '1979-1993', make: 'Ford', model: 'Mustang Foxbody' }],
},
{
  id: 't14-eibach-prokit-s197', sku: 'eib35101.140', turn14ItemId: '1616',
  name: "Eibach Pro-Kit Springs — Mustang S197 (05-10)",
  shortDescription: 'Multi-rate progressive springs. Lowers 1.0" F / 1.3" R.',
  longDescription: 'Eibach Pro-Kit for 2005-2010 Ford Mustang V8 and Convertible 6-cyl. Multi-rate progressive spring design lowers ride height 1.0" front and 1.3" rear. Designed to match your factory shock valving — no harsh ride or handling loss. Includes installation hardware.',
  price: 289.67, mapPrice: 395, retailPrice: 438.89,
  brandName: 'Eibach', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true, t14Inventory: { t14Stock: 4, mfrStock: 25 },
  yearMakeModel: [{ year: '2005-2010', make: 'Ford', model: 'Mustang S197 GT' }],
},

];

// Category definitions with icons and descriptions
export const categories = [
  { id: 'headers-exhaust', name: 'Headers & Exhaust', icon: '🔥', color: '#dc2626' },
  { id: 'intakes', name: 'Intakes', icon: '💨', color: '#7c3aed' },
  { id: 'superchargers', name: 'Superchargers', icon: '⚡', color: '#0891b2' },
  { id: 'turbo-kits', name: 'Turbo Kits', icon: '🌀', color: '#ea580c' },
  { id: 'fuel-systems', name: 'Fuel Systems', icon: '⛽', color: '#d97706' },
  { id: 'suspension-gears', name: 'Suspension & Gears', icon: '🔧', color: '#4b5563' },
  { id: 'engine-components', name: 'Engine Components', icon: '⚙️', color: '#1e293b' },
];

// Mustang generation map
export const mustangGenerations = [
  { years: '64-70', name: 'First Gen (Classic)', slug: 'classic' },
  { years: '79-93', name: 'Fox Body', slug: 'foxbody' },
  { years: '94-04', name: 'SN95', slug: 'sn95' },
  { years: '05-14', name: 'S197', slug: 's197' },
  { years: '15-23', name: 'S550', slug: 's550' },
  { years: '24+', name: 'S650 Dark Horse', slug: 's650' },
];

// Get all items from Turn 14 (the API endpoint) for live lookups
export function getProducts(): Product[] {
  return products;
}

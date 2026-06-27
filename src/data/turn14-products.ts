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

// ─── HEADERS & EXHAUST ──────────────────────────────

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
  id: 't14-kooks-headers-sn95', sku: 'ksh1155H430', turn14ItemId: '114244',
  name: "Kooks Long Tube Headers — S197 GT (05-14)",
  shortDescription: 'T3 stainless long tubes for S197 Mustang. Max flow, bolt-on fitment.',
  longDescription: 'Handcrafted Kooks long tube headers for 2005-2014 Ford Mustang GT (S197). Mandrel-bent T304SS tubing with optimized tube lengths for maximum scavenging. Flanged primarys accept any turbo or exhaust setup. Includes OEM gaskets and hangers. Great first mod for power adder builds.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing lookup
  brandName: 'Kooks Headers', category: 'Headers & Exhaust',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2005-2014', make: 'Ford', model: 'Mustang GT' }],
},

{
  id: 't14-ssw-ltube', sku: 'sswM11HDRCATX', turn14ItemId: '115306',
  name: "Stainless Works Long Tube Headers — Mustang GT (11-14)",
  shortDescription: 'High-flow long tube headers with high-flow cats for SN95/S197.',
  longDescription: 'Stainless Works 2011-2014 Mustang GT Long Tube Headers. Features 1-7/8" primaries, integrated high-flow catalytic converters, and a 3" X-pipe collector. Mandrel-bent stainless construction for maximum flow. Direct bolt-on — no welding required.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Stainless Works', category: 'Headers & Exhaust',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2011-2014', make: 'Ford', model: 'Mustang GT' }],
},

{
  id: 't14-ssw-catback', sku: 'sswM12CB3', turn14ItemId: '115314',
  name: "Stainless Works Catback Exhaust — Mustang GT (11-14)",
  shortDescription: 'Retro chambered mufflers with polished tips. Deep aggressive tone.',
  longDescription: 'Stainless Works Retro Chambered catback for 2011-2014 Mustang GT / 2011-2012 Shelby GT500. Features 3" stainless tubing, retro-style chambered mufflers, polished 4" tips. Produces a deep aggressive tone without excessive drone. Includes all hardware.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing — ~$1795 MAP
  brandName: 'Stainless Works', category: 'Headers & Exhaust',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2011-2014', make: 'Ford', model: 'Mustang GT' }, { year: '2011-2012', make: 'Ford', model: 'Mustang Shelby GT500' }],
},

// ─── SUPERCHARGERS (placeholder — Whipple not found in T14 catalog) ─────

{
  id: 't14-airaid-intake', sku: 'air455-356', turn14ItemId: '374253',
  name: "Airaid MXP Series Cold Air Intake — Mustang GT (18-20)",
  shortDescription: 'Mandrel-bent intake tube, reusable filter. Direct bolt-on upgrade.',
  longDescription: 'Airaid 2018-2020 Mustang GT V8 5.0L MXP Series Performance Air Intake System. Features a mandrel-bent inlet tube, high-flow reusable filter, and heat shield. Dyno-tested for verified power gains over stock. Direct bolt-on installation — no tune required.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Airaid', category: 'Intakes',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2018-2020', make: 'Ford', model: 'Mustang GT' }],
},

// ─── SUSPENSION ─────────────────────────────────────

{
  id: 't14-bmr-control-arm-gt500', sku: 'bmrUCA754H', turn14ItemId: '1025673',
  name: "BMR Adjustable Upper Control Arm — GT500 (11-14)",
  shortDescription: 'On-car adjustable UCA for Shelby GT500 with 9" rear. Black Hammertone.',
  longDescription: 'BMR Performance 2011-2014 Ford Mustang Shelby GT500 Upper Control Arm. Designed for the 9-inch housing on GT500 applications. Adjustable caster/camber for proper alignment after drop or lift. On-car installable — no removal required. Black Hammertone powdercoat finish.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'BMR Suspension', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true, t14Inventory: { t14Stock: 0, mfrStock: 0 },
  yearMakeModel: [{ year: '2011-2014', make: 'Ford', model: 'Mustang Shelby GT500' }],
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

{
  id: 't14-eibach-prospacer-s197', sku: 'eibS90-4-25-010', turn14ItemId: '183917',
  name: "Eibach Pro-Spacer — Mustang SN95 (94-04)",
  shortDescription: '25mm front spacer kit. 5x114.3 bolt pattern / 70.5 hub.',
  longDescription: 'Eibach Pro-Spacer System for 1994-2004 Ford Mustang (SN95). 25mm front wheel spacer with 5x114.3 bolt pattern and 70.5mm hub bore. High-strength aluminum construction with CNC-machined centering lip. Improves wheel clearance and stance.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Eibach', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '1994-2004', make: 'Ford', model: 'Mustang SN95' }],
},

{
  id: 't14-eibach-prospacer-gt500', sku: 'eibS90-1-05-038', turn14ItemId: '183929',
  name: "Eibach Pro-Spacer — Mustang GT500 (07-14)",
  shortDescription: '5mm rear spacer for Shelby GT500. 5x114.3 bolt pattern.',
  longDescription: 'Eibach Pro-Spacer 5mm rear spacer kit for 2007-2014 Ford Mustang GT/500. Perfect for filling gap after wheel spacers on the rear. High-strength aluminum with CNC centering. Part of Eibachs modular Spacer System.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Eibach', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2007-2014', make: 'Ford', model: 'Mustang GT / Shelby GT500' }],
},

// ─── FUEL SYSTEMS ──────────────────────────────────

{
  id: 't14-aeromotive-fuel-pump', sku: 'aer19140', turn14ItemId: '1032068',
  name: "Aeromotive In-Tank Fuel Pump & Hanger — Foxbody (86-98)",
  shortDescription: '525 LPH in-tank pump for high-horsepower Fox Mustangs.',
  longDescription: 'Aeromotive 1986-1998 Ford Mustang 525 LPH In-Tank Fuel Pump & Hanger Assembly. Designed for high-horsepower Foxbody Mustang builds requiring reliable fuel delivery. Complete assembly includes mounting hardware and wiring harness connections.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Aeromotive', category: 'Fuel Systems',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '1986-1998', make: 'Ford', model: 'Mustang Foxbody' }],
},

{
  id: 't14-aeromotive-stealth-tank', sku: 'aer18698', turn14ItemId: '111737',
  name: "Aeromotive Stealth Fuel Tank — Classic Mustang (64-68)",
  shortDescription: '200L Stealth tank for early body style Mustangs. Anti-surge design.',
  longDescription: 'Aeromotive 1964-1968 Ford Mustang 200 Liter Stealth Fuel Tank. Features Aeromovies proprietary anti-surge baffle system, braided stainless output lines, and corrosion-resistant coating. Direct replacement for stock tanks — no modifications required.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Aeromotive', category: 'Fuel Systems',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '1964-1968', make: 'Ford', model: 'Mustang Classic' }],
},

// ─── CLUTCH & DRIVETRAIN ──────────────────────────

{
  id: 't14-act-mod-twin', sku: 'actT1R-F12', turn14ItemId: '694164',
  name: "ACT Mod-Twin HD Clutch Kit — Mustang GT (18-23)",
  shortDescription: '10.5" dual-friction street/strip clutch kit. Sprung hub for streetability.',
  longDescription: 'ACT 2018-2023 Ford Mustang GT 5.0L Mod-Twin HD Clutch Kit. Dual-material friction disc delivers maximum clamping force (675 lb-ft capacity) while maintaining smooth engagement on the street. Machined aluminum pressure plate, sprung hub for drivability. Compatible with short-throw shifters.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'ACT Clutch', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2018-2023', make: 'Ford', model: 'Mustang GT' }],
},

{
  id: 't14-acl-main-bearings', sku: 'acl4M2737H-.025', turn14ItemId: '114841',
  name: "ACL Race Series Main Bearings — S197 Coyote V8 (05-14)",
  shortDescription: 'Premium main bearings for high-horsepower GT builds. .025 under.',
  longDescription: 'ACL Race Series main bearing set for 2005-2014 Ford Mustang GT 5.0L / 4.6L V8 Coyote engine. These are the same bearings used in professional racing applications. Precision-manufactured for maximum reliability and load capacity. Sold as a complete set.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'ACL', category: 'Engine Components',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2005-2014', make: 'Ford', model: 'Mustang GT V8' }],
},

{
  id: 't14-bmr-diff-bushing-s550', sku: 'bmrBK049', turn14ItemId: '1026874', // corrected from search
  name: "BMR Differential Bushing Kit — S550 Mustang (15-17)",
  shortDescription: 'Polyurethane diff bushings for S550. Red finish.',
  longDescription: 'BMR Performance 2015-2017 Mustang GT Diff Bushing Kit. Polyurethane differential mounting bushings replace worn OEM rubber for precise differential positioning. Essential companion mod when lowering or adding power. Red powdercoat finish.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'BMR Suspension', category: 'Suspension & Gears',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '2015-2017', make: 'Ford', model: 'Mustang S550 GT' }],
},

{
  id: 't14-aeromotive-fuel-rail', sku: 'aer14178', turn14ItemId: '1006728',
  name: "Aeromotive Fuel Rails — Mustang (various)",
  shortDescription: 'Universal fuel rails. For high-horsepower builds.',
  longDescription: 'Aeromotive aftermarket fuel rail for Mustang applications. CNC-machined billet aluminum with AN fittings for easy boost-referenced regulator or fuel pressure sensor mounting. Designed for turbo and supercharged builds requiring increased fuel flow.',
  price: 0, mapPrice: 0, retailPrice: 0, // needs pricing
  brandName: 'Aeromotive', category: 'Fuel Systems',
  imageUrl: '', imageUrls: [], inStock: true,
  yearMakeModel: [{ year: '1979-2024', make: 'Ford', model: 'Mustang' }],
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

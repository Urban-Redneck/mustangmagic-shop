import { Product } from '@/types';

// Mock product catalog — real data will come from Turn 14 API once integrated
export const products: Product[] = [
  // HEADERS & EXHAUST
  {
    id: 'kooks-fox', sku: 'KO-KKT-FB', name: "Kooks Long Tube Headers - Foxbody (79-93)",
    shortDescription: 'HST 2" long tube headers, 1.75" tubes, flanged primarys. Made in USA.',
    longDescription: 'Handcrafted HST long tube headers for Foxbody Mustangs. T3/turbo eligible. Mandrel bent 1.75" primary tubes with 3" collector. Designed for maximum flow and ground clearance. Perfect for turbo or naturally aspirated builds. Made in the USA.',
    price: 895.00, mapPrice: 895.00, listPrice: 1045.00, brandName: 'Kooks', category: 'Headers',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '1979-1993', make: 'Ford', model: 'Mustang Foxbody' }],
  },
  {
    id: 'kooks-sn95', sku: 'KO-KKT-SV', name: "Kooks Long Tube Headers - SN95 (94-04)",
    shortDescription: 'HST long tube headers for SN95 Mustang. Turbo ready.',
    longDescription: 'Handcrafted HST long tube headers designed for SN95 Foxbody and New Fox Mustangs. 1.75" tubes with 3" collector. Perfect fitment ensures no welding required. T3/turbo compatible.',
    price: 925.00, mapPrice: 925.00, listPrice: 1085.00, brandName: 'Kooks', category: 'Headers',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '1994-2004', make: 'Ford', model: 'Mustang SN95' }],
  },
  {
    id: 'ss-exhaust', sku: 'SS-EHT-SV', name: "Stainless Works Cat-Back Exhaust - SVT/BOSS (01-04)",
    shortDescription: 'Full stainless steel cat-back system with quad tips.',
    longDescription: 'Stainless Works 304 SS cat-back exhaust for SN95 SVT Cobra and Mustang 4.6L. Includes undercarriage resonator, tailpipe assembly with quad polished tips. Deep, aggressive tone without drone on highway.',
    price: 1249.00, mapPrice: 1249.00, listPrice: 1399.00, brandName: 'Stainless Works', category: 'Headers',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2001-2004', make: 'Ford', model: 'Mustang SVT/BOSS' }],
  },
  // SUPERCHARGERS
  {
    id: 'whipple-62', sku: 'WHL-2-8597', name: "Whipple 3.5L Supercharger Kit - S197 V8 (05-14)",
    shortDescription: 'Drop-in bolt-on supercharger, 150hp gain verified on dyno.',
    longDescription: 'Whipple Gen 3 XTR 3.5L supercharger kit for 2005-2014 Mustang GT (4.6L and 5.0L). Includes polished blower, intercooler pump, fuel system components, and tune. Dyno verified 150+ hp gain over stock. Installation available at our Deer Park shop.',
    price: 3495.00, mapPrice: 3495.00, listPrice: 3899.00, brandName: 'Whipple', category: 'Superchargers',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2005-2014', make: 'Ford', model: 'Mustang V8' }],
  },
  {
    id: 'ess-gen3', sku: 'ESS-TS1-1900', name: "ESS Tune-Spec Gen III Supercharger - S550 (15-23)",
    shortDescription: 'Whipple-based Eaton TVS 2300 blower for S550 GT.',
    longDescription: 'Eaton TVS 2300 style impeller in ESS Tune-Spec housing. Designed for the 2015-2023 Mustang GT 5.0L. Includes intercooler pump, mounting bracket, pulley, and tune. Approximately 200 whp gain.',
    price: 3895.00, mapPrice: 3895.00, listPrice: 4295.00, brandName: 'Eaton/ESS', category: 'Superchargers',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2015-2023', make: 'Ford', model: 'Mustang S550 GT' }],
  },
  // TURBO KITS
  {
    id: 'tomei-t45', sku: 'TM-T45-ST', name: "Tomei Type-R T45 Turbo System - Mustang GT (15-23)",
    shortDescription: 'Complete turbo kit with HKS wastegate, charge pipes, manifold.',
    longDescription: 'Complete drop-in turbo system for S550 5.0L GT. Includes turbo manifold, downpipe, charge pipes, intercooler, and mounting hardware. Supports up to T4 flange turbos. Great base for a street/strip build — expect 600-700+ whp with supporting mods.',
    price: 4295.00, mapPrice: 4295.00, listPrice: 4795.00, brandName: 'Tomei', category: 'Turbo Kits',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2015-2023', make: 'Ford', model: 'Mustang GT' }],
  },
  {
    id: 'coyotetwin', sku: 'CT-TWIN-GT', name: "Coyote Twin Turbo - Complete Kit (S197 05-14)",
    shortDescription: 'Street-strip twin turbo kit for S197 Coyote/GT.',
    longDescription: 'Complete twin turbo system for 2005-2014 Mustang GT. Includes two Garrett turbos, custom manifold, charge pipes, fuel system upgrades, and E85-ready injection. Dyno tuned at our facility. Expected output: 700+ whp on E85.',
    price: 8995.00, mapPrice: 8995.00, listPrice: 10495.00, brandName: 'Coyote Twin', category: 'Turbo Kits',
    imageUrl: '', imageUrls: [], inStock: false,
    yearMakeModel: [{ year: '2005-2014', make: 'Ford', model: 'Mustang S197 GT' }],
  },
  // FUEL SYSTEMS
  {
    id: 'fuel-pump', sku: 'AER-FP525', name: "Aeromotive 340 LPH Fuel Pump - E85 Compatible",
    shortDescription: 'High-flow fuel pump for turbo/supercharged Mustangs. E85 ready.',
    longDescription: 'Aeromotive 340 LPH in-tank fuel pump. E85 compatible with dual stainless steel shafts. Essential support mod for any build making 400+ whp. Includes 10" suction tube, strainer, and wiring harness.',
    price: 329.00, mapPrice: 329.00, listPrice: 379.00, brandName: 'Aeromotive', category: 'Fuel Systems',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [
      { year: '1979-1993', make: 'Ford', model: 'Mustang Foxbody' },
      { year: '1994-2004', make: 'Ford', model: 'Mustang SN95' },
    ],
  },
  // SUSPENSION
  {
    id: 'bhrr-control-arm', sku: 'BH-CR2378', name: 'BMR Control Arm Kit - S197 Front (05-14)',
    shortDescription: 'Heavy-duty adjustable control arms for S197 Mustang.',
    longDescription: 'Complete front control arm kit for 2005-2014 Mustang. Includes upper and lower arms with polyurethane bushings. Eliminates suspension geometry issues from worn OEM arms. Improves alignment options and handling response.',
    price: 389.00, mapPrice: 389.00, listPrice: 449.00, brandName: 'BMR', category: 'Suspension',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2005-2014', make: 'Ford', model: 'Mustang S197' }],
  },
  {
    id: 'eibach-coilover', sku: 'EB-PRO-KIT-SV', name: "Eibach Pro-Kit Coilover Set - S550 (15-23)",
    shortDescription: 'Adjustable coilover suspension for track and street use.',
    longDescription: 'Eibach Pro-Kit performance suspension kit for S550 GT. Progressive rate springs with adjustable damping. Lowers ride height 1.5" front / 2" rear. Includes polyurethane bushings, spacers, and alignment shims. Great daily-drivable setup.',
    price: 1895.00, mapPrice: 1895.00, listPrice: 2195.00, brandName: 'Eibach', category: 'Suspension',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [{ year: '2015-2023', make: 'Ford', model: 'Mustang S550' }],
  },
  // BRAKES
  {
    id: 'brembo-brake-kit', sku: 'BRM-BB6-SV', name: "Brembo Big Brake Kit - 6-Piston Front (GT/CS)",
    shortDescription: '6-piston Brembo caliper kit with drilled rotors.',
    longDescription: 'Complete front big brake upgrade with Brembo 6-piston monobloc calipers, 15.3" two-piece floating rotors, and stainless steel brake lines. Designed for S197/S550 Mustang GT/CS. Dramatic improvement in stopping power and fade resistance for track days.',
    price: 4595.00, mapPrice: 4595.00, listPrice: 5295.00, brandName: 'Brembo', category: 'Brake Upgrades',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [
      { year: '2005-2014', make: 'Ford', model: 'Mustang S197 GT' },
      { year: '2015-2023', make: 'Ford', model: 'Mustang S550 GT' },
    ],
  },
  // GEAR STUFF
  {
    id: 'mtm-gear-kit', sku: 'MTM-KIT-373', name: "MTM Performance Gear Ratio Conversion Kit - 3.73 (SN95/S197)",
    shortDescription: 'Complete ring & pinion kit for SN95 and S197 rear ends.',
    longDescription: 'MTM ring and pinion gear set in 3.73 ratio. Fits Ford 8.8" and 9" rear axles used in SN95 (94-04) and S197 (05-14) Mustangs. Includes new bearings, shims, install kit, and differential lubricant. Perfect companion for any power adder build.',
    price: 695.00, mapPrice: 695.00, listPrice: 799.00, brandName: 'MTM', category: 'Suspension & Gears',
    imageUrl: '', imageUrls: [], inStock: true,
    yearMakeModel: [
      { year: '1994-2004', make: 'Ford', model: 'Mustang SN95' },
      { year: '2005-2014', make: 'Ford', model: 'Mustang S197' },
    ],
  },
];

// Category definitions with icons and descriptions
export const categories = [
  { id: 'headers', name: 'Headers & Exhaust', icon: '🔥', color: '#dc2626' },
  { id: 'superchargers', name: 'Superchargers', icon: '💨', color: '#7c3aed' },
  { id: 'turbo-kits', name: 'Turbo Kits', icon: '🌀', color: '#0891b2' },
  { id: 'fuel-systems', name: 'Fuel Systems', icon: '⛽', color: '#d97706' },
  { id: 'suspension', name: 'Suspension & Gears', icon: '🔧', color: '#4b5563' },
  { id: 'brakes', name: 'Brake Upgrades', icon: '🛑', color: '#dc2626' },
];

// Filter categories that only apply to Mustangs (all our business)
export const mustangGenerations = [
  { years: '79-93', name: 'Fox Body', slug: 'foxbody' },
  { years: '94-04', name: 'SN95', slug: 'sn95' },
  { years: '05-14', name: 'S197', slug: 's197' },
  { years: '15-23', name: 'S550', slug: 's550' },
  { years: '24+', name: 'S650', slug: 's650' },
];

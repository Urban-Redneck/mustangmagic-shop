// Turn 14 Product Category Mapping
// Maps Turn 14 categories → our Supabase categories for proper fitment display

export const T14_TO_CATEGORY_MAP: Record<string, { categoryId: string; subcategoryId?: string }> = {
  'Headers':               { categoryId: 'headers-exhaust' },
  'Exhaust Systems':       { categoryId: 'headers-exhaust' },
  'Cat-Back Exhaust':      { categoryId: 'headers-exhaust', subcategoryId: 'cat-back' },
  'Long Tube Headers':     { categoryId: 'headers-exhaust', subcategoryId: 'headers' },
  'Short Tube Headers':    { categoryId: 'headers-exhaust', subcategoryId: 'headers' },
  'Exhaust Tips':          { categoryId: 'headers-exhaust', subcategoryId: 'exhaust-tips' },
  'Superchargers':         { categoryId: 'superchargers' },
  'SC Kits':               { categoryId: 'superchargers', subcategoryId: 'sc-kits' },
  'Turbo Systems':         { categoryId: 'turbo-kits' },
  'T45 Turbo':             { categoryId: 'turbo-kits', subcategoryId: 't45-kits' },
  'Intakes':               { categoryId: 'intakes' },
  'Cold Air Intakes':      { categoryId: 'intakes', subcategoryId: 'cold-air-intakes' },
  'Throttle Bodies':       { categoryId: 'intakes', subcategoryId: 'throttle-bodies' },
  'Fuel Pumps':            { categoryId: 'fuel-systems', subcategoryId: 'fuel-pumps' },
  'Fuel Injectors':        { categoryId: 'fuel-systems', subcategoryId: 'injectors' },
  'Fuel Delivery':         { categoryId: 'fuel-systems', subcategoryId: 'fuel-rails' },
  'Suspension':            { categoryId: 'suspension-gears' },
  'Control Arms':          { categoryId: 'suspension-gears', subcategoryId: 'control-arms' },
  'Springs':               { categoryId: 'suspension-gears', subcategoryId: 'springs-coilovers' },
  'Coilovers':             { categoryId: 'suspension-gears', subcategoryId: 'springs-coilovers' },
  'Differential Parts':    { categoryId: 'suspension-gears', subcategoryId: 'diff-parts' },
  'Gear Kits':             { categoryId: 'suspension-gears', subcategoryId: 'gear-kits' },
  'Brake Kits':            { categoryId: 'brake-upgrades' },
  'Big Brake Kits':        { categoryId: 'brake-upgrades', subcategoryId: 'bbk-kits' },
  'ECU & Tuning':          { categoryId: 'electrical-tuning' },
  'Engine Parts':          { categoryId: 'engine-components' },
  'Convertible Tops':      { categoryId: 'interior-exterior', subcategoryId: 'convertible-tops' },
};

// Brand slug normalization (Turn 14 brand names → our slug)
export const BRAND_SLUG_MAP: Record<string, string> = {
  'Whipple': 'whipple',
  'Eaton/ESS Supercharger Systems': 'ess',
  'Tomei': 'tomei',
  'Kooks Shorty Headers & X-Pipes': 'kooks',
  'Aeromotive Inc': 'aeromotive',
  'BMR Suspension': 'bmr',
  'Eibach': 'eibach',
  'Brembo': 'brembo',
  'Stainless Works Exhaust': 'stainless-works',
  'MTM Performance': 'mtm-performance',
  'Roush Performance': 'roush',
  'Palmer Performance': 'palmer-performance',
  'BBKPerformance': 'bbk',
  'Ford Racing': 'ford-performance',
  'SVE (Special Vehicle Equipment)': 'sve',
};

// Must fitment generation → our vehicle_generation.matching field
export const MUSTANG_FITMENT: Record<string, string[]> = {
  'Foxbody':     ['1979-1993'],
  'SN95':        ['1994-2004'],
  'S197':        ['2005-2014'],
  'S550':        ['2015-2023'],
  'S650':        ['2024-present'],
  'Foxbody/SN95':['1979-2004'],
};

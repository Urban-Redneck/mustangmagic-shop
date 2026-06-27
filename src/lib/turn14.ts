// Turn 14 Distribution API integration (real API)
// Base: https://api.turn14.com/v1/
// Auth: POST /v1/token with client_credentials grant_type

const T14_BASE = 'https://api.turn14.com';
const T14_TESTING_BASE = 'https://apitest.turn14.com';

function baseForEnv(): string {
  return process.env.TURN14_API_BASE?.includes('apitest') ? T14_TESTING_BASE : T14_BASE;
}

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

// === Internal T14 types (snake_case as returned by API) ===

interface T14ItemAttrs {
  part_number?: string;
  mfr_part_number?: string;
  product_name?: string;
  part_description?: string;
  category?: string;
  subcategory?: string;
  brand_id?: number;
  brand?: string;
  price_group_id?: number;
  price_group?: string;
  active?: boolean;
  regular_stock?: boolean;
  thumbnail?: string;
  dimensions?: Array<{ box_number: number; length: number; width: number; height: number; weight: number }>;
}

interface T14ItemRow {
  id: string;
  attributes?: T14ItemAttrs;
}

interface T14InventoryAttrs {
  inventory?: Record<string, number>;
  manufacturer?: { stock: number; esd?: string };
  eta?: { qty_on_order: Record<string, number>; estimated_availability: Record<string, string> };
}

interface T14PricingAttrs {
  purchase_cost?: number;
  has_map?: boolean;
  can_purchase?: boolean;
  pricelists?: Array<{ name: string; price: number }>;
}

// === Public types (camelCase) ===

export interface ProductWithTurn14Data {
  turn14ItemId: string;
  turn14PartNumber: string;
  productName: string;
  partDescription: string;
  category: string;
  subcategory: string;
  brandId: number;
  brandName: string;
  active: boolean;
  regularStock: boolean;
  thumbnail?: string;
  dimensions: Array<{ box_number: number; length: number; width: number; height: number; weight: number }>;
  purchaseCost: number;
  priceLists: Array<{ name: string; price: number }>;
  inventory: Record<string, number>;
  totalInventory: number;
  hasManufacturerStock: boolean;
}

export interface Turn14Brand {
  id: string;
  name: string;
  dropship: boolean;
  logo?: string;
  priceGroups?: Array<{ pricegroup_id: number; pricegroup_name: string }>;
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(creds: Credentials): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const baseUrl = baseForEnv();
  const response = await fetch(`${baseUrl}/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Turn 14 auth failed (${baseUrl}/v1/token): ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

async function authedFetch(creds: Credentials, path: string): Promise<Response> {
  const token = await getAccessToken(creds);
  const baseUrl = baseForEnv();
  return fetch(`${baseUrl}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

export async function getAccessTokenFromAPI(creds: Credentials): Promise<string> {
  return getAccessToken(creds);
}

// ===== INVENTORY =====

export async function getItemInventory(itemIds: string[], creds: Credentials): Promise<Map<string, T14InventoryAttrs>> {
  const response = await authedFetch(creds, `/v1/inventory/${encodeURIComponent(itemIds.join(','))}`);
  if (!response.ok) return new Map();
  
  const data = await response.json();
  const result = new Map<string, T14InventoryAttrs>();
  
  for (const item of (Array.isArray(data.data) ? data.data : [])) {
    if (item && (item as any).id) result.set((item as any).id, (item as any).attributes || {});
  }
  return result;
}

// ===== PRICING =====

export async function getItemPricing(itemId: string, creds: Credentials): Promise<T14PricingAttrs | null> {
  const response = await authedFetch(creds, `/v1/pricing/${encodeURIComponent(itemId)}`);
  if (!response.ok) return null;
  
  const data = await response.json();
  const pricing = (data.data as any) || null;
  return pricing?.attributes || null;
}

// ===== ITEMS =====

export async function getAllItems(creds: Credentials, page = 1): Promise<{ items: T14ItemRow[]; totalPages: number }> {
  const response = await authedFetch(creds, `/v1/items?page=${page}`);
  if (!response.ok) return { items: [], totalPages: 0 };

  const data = await response.json();
  const rawItems = (data.data || []) as T14ItemRow[];
  return { items: rawItems, totalPages: (data.meta?.total_pages) || 0 };
}

export async function getAllItemsForBrand(creds: Credentials, brandId: number, page = 1): Promise<{ items: T14ItemRow[]; totalPages: number }> {
  const response = await authedFetch(creds, `/v1/items/brand/${brandId}?page=${page}`);
  if (!response.ok) return { items: [], totalPages: 0 };

  const data = await response.json();
  const rawItems = (data.data || []) as T14ItemRow[];
  return { items: rawItems, totalPages: (data.meta?.total_pages) || 0 };
}

export async function getSingleItem(itemId: string, creds: Credentials): Promise<T14ItemAttrs | null> {
  const response = await authedFetch(creds, `/v1/items/${encodeURIComponent(itemId)}`);
  if (!response.ok) return null;

  const data = await response.json();
  const item = (data.data as any) || null;
  return item?.attributes || null;
}

// ===== FITMENT =====

export async function getFitmentData(itemId: string, creds: Credentials): Promise<{ vehicleIds: number[][]; lateModelsOnly: boolean } | null> {
  const response = await authedFetch(creds, `/v1/items/fitment/${encodeURIComponent(itemId)}`);
  if (!response.ok) return null;

  const data = await response.json();
  const fitment = (data.data as any) || null;
  if (!fitment?.attributes) return null;

  return {
    vehicleIds: fitment.attributes.vehicleIds || [],
    lateModelsOnly: fitment.attributes.late_models_only ?? false,
  };
}

// ===== BRANDS =====

export async function getAllBrands(creds: Credentials, page = 1): Promise<{ brands: Turn14Brand[]; totalPages: number }> {
  const response = await authedFetch(creds, `/v1/brands?page=${page}`);
  if (!response.ok) return { brands: [], totalPages: 0 };

  const data = await response.json();
  const raw = (data.data || []) as Array<{ id: string; attributes?: { name: string; dropship: boolean; logo?: string; pricegroups?: Array<{ pricegroup_id: number; pricegroup_name: string }> } }>;

  const brands = raw.map(b => ({
    id: b.id,
    name: b.attributes?.name || '',
    dropship: b.attributes?.dropship ?? false,
    logo: (b.attributes?.logo as string | undefined),
    priceGroups: (b.attributes?.pricegroups as Array<{ pricegroup_id: number; pricegroup_name: string }> | undefined),
  }));

  return { brands, totalPages: (data.meta?.total_pages) || 0 };
}

// ===== SYNC MUSTANG PRODUCTS =====

export async function syncMustangProducts(creds: Credentials): Promise<ProductWithTurn14Data[]> {
  const allItems: ProductWithTurn14Data[] = [];
  let page = 1;

  while (true) {
    console.log(`[T14] Syncing items page ${page}...`);
    const { items: batch, totalPages } = await getAllItems(creds, page);
    
    if (batch.length === 0) break;
    
    // Filter for Mustang-relevant products
    const mustangItems = batch.filter(row => {
      if (!row.attributes) return false;
      const attrs = row.attributes;
      const nameLower = ((attrs.product_name || '') + ' ' + (attrs.part_description || '')).toLowerCase();
      return nameLower.includes('mustang') || 
             nameLower.includes('foxbody') || 
             nameLower.includes('sn95') || 
             nameLower.includes('s197') || 
             nameLower.includes('s550') || 
             nameLower.includes('s650') ||
             (attrs.brand || '').toLowerCase().includes('mustang');
    });

    console.log(`[T14] Found ${mustangItems.length} Mustang-relevant items on page ${page}`);
    
    for (const row of mustangItems) {
      if (!row.attributes) continue;
      const attrs = row.attributes;

      const pricingData = await getItemPricing(row.id, creds);
      const invMap = await getItemInventory([row.id], creds);
      const invData = invMap.get(row.id);
      
      // Find our dealer pricelist
      let purchaseCost = 0;
      if (pricingData) {
        const jobberPrice = pricingData.pricelists?.find(p => p.name.toLowerCase() === 'jobber');
        if (jobberPrice) {
          purchaseCost = jobberPrice.price;
        } else {
          const mapPrice = pricingData.pricelists?.find(p => p.name.toLowerCase() === 'map');
          purchaseCost = mapPrice ? mapPrice.price * 0.7 : (pricingData.purchase_cost ?? 0);
        }
      }

      // Total inventory across warehouses
      let totalInv = 0;
      if (invData?.inventory) {
        for (const qty of Object.values(invData.inventory)) totalInv += qty as number;
      }

      allItems.push({
        turn14ItemId: row.id,
        turn14PartNumber: attrs.part_number || '',
        productName: attrs.product_name || '',
        partDescription: attrs.part_description || '',
        category: attrs.category || '',
        subcategory: attrs.subcategory || '',
        brandId: attrs.brand_id || 0,
        brandName: attrs.brand || '',
        active: attrs.active ?? true,
        regularStock: attrs.regular_stock ?? false,
        thumbnail: attrs.thumbnail,
        dimensions: attrs.dimensions || [],
        purchaseCost,
        priceLists: pricingData?.pricelists || [],
        inventory: invData?.inventory || {},
        totalInventory: totalInv,
        hasManufacturerStock: !!invData?.manufacturer?.stock && invData.manufacturer.stock > 0,
      });
    }

    if (batch.length < 1000 || page >= totalPages) break;
    page++;
    
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[T14] Sync complete: ${allItems.length} Mustang-relevant items`);
  return allItems;
}

// ===== SEARCH (keyword only — no YMM on server) =====

export async function searchMustangProducts(
  keyword: string,
  brandName?: string,
  creds?: Credentials
): Promise<ProductWithTurn14Data[]> {
  if (!creds) return [];

  // === Ford Mustang relevance filter ===
  const MUSTANG_FORD_KEYWORDS = [
    'mustang', 'gt', 'shelby', 'cobra', 'mach 1', 'boss', 'foxbody', 'sn95',
    's197', 's550', 's650', 'dark horse', 'pony', 'ford', '5.0l', '4.6l',
    'coyote', 'v8', 'svt', 'roush', 'palmer performance',
  ];

  function isMustangFordProduct(attrs: T14ItemAttrs): boolean {
    if (!attrs || !attrs.active) return false;
    const name = (attrs.product_name || '').toLowerCase();
    const desc = (attrs.part_description || '').toLowerCase();
    const brand = (attrs.brand || '').toLowerCase();
    const text = `${name} ${desc} ${brand}`;

    // Exclude non-auto "mustang" brands
    if (/motorcycle|motor bike|mfg.*horse|pony express/i.test(text)) return false;

    // Must have Mustang or Ford explicitly in name/brand/description
    if (!/mustang|ford/i.test(name) && !/mustang|ford/i.test(brand)) {
      const hasKeyword = MUSTANG_FORD_KEYWORDS.some(kw => text.includes(kw));
      if (!hasKeyword) return false;
    }

    return true;
  }

  const credsUsed = creds || { clientId: process.env.TURN14_CLIENT_ID!, clientSecret: process.env.TURN14_CLIENT_SECRET! };
  if (!credsUsed?.clientId) return [];

  // Get all brands (no pagination — just page 1 is enough to get brand IDs)
  const { brands } = await getAllBrands(credsUsed);
  
  // If no brand filter provided, use ALL brands that have Mustang-relevant items
  let targetBrandIds: number[] = [];
  if (brandName) {
    targetBrandIds = brands.filter(b => b.name.toLowerCase().includes(brandName.toLowerCase())).map(b => parseInt(b.id));
  }

  // If no specific brand filter, scan all brands for Mustang items
  // (This is the default search path when user just types a keyword)
  const allResults: ProductWithTurn14Data[] = [];
  
  if (targetBrandIds.length > 0) {
    // Search within specific brand(s)
    for (const brandId of targetBrandIds) {
      let page = 1;
      while (page <= 5) {
        const { items: batch } = await getAllItemsForBrand(creds, brandId, page);
        if (batch.length === 0) break;
        
        for (const row of batch) {
          if (!row.attributes) continue;
          const attrs = row.attributes;

          // Apply search keyword filter first
          if (keyword && !((attrs.product_name || '') + ' ' + (attrs.part_description || '')).toLowerCase().includes(keyword.toLowerCase())) {
            continue;
          }

          // Only include Ford Mustang products
          if (!isMustangFordProduct(attrs)) continue;

          allResults.push({
            turn14ItemId: row.id,
            turn14PartNumber: attrs.part_number || '',
            productName: attrs.product_name || '',
            partDescription: attrs.part_description || '',
            category: attrs.category || '',
            subcategory: attrs.subcategory || '',
            brandId: attrs.brand_id || 0,
            brandName: attrs.brand || '',
            active: attrs.active ?? true,
            regularStock: attrs.regular_stock ?? false,
            dimensions: attrs.dimensions || [],
            purchaseCost: 0,
            priceLists: [],
            inventory: {},
            totalInventory: 0,
            hasManufacturerStock: false,
          });
        }
        page++;
      }
    }
  }

  return allResults;
}

// ===== DROPSHIP QUOTE =====

export interface DropshipQuoteRequest {
  poNumber: string;
  items: Array<{ itemId: string; quantity: number }>;
  recipient: {
    company: string;
    name: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
    email_address: string;
    phone_number: string;
    is_shop_address: boolean;
  };
}

export async function createDropshipQuote(req: DropshipQuoteRequest, creds: Credentials): Promise<unknown> {
  const quoteData = {
    data: {
      environment: baseForEnv() === T14_TESTING_BASE ? 'testing' : 'production',
      po_number: req.poNumber,
      sales_source: 2,
      locations: [{
        location: 'default',
        combine_in_out_stock: true,
        items: req.items.map(i => ({
          item_identifier: i.itemId,
          item_identifier_type: 'item_id',
          quantity: i.quantity,
        })),
      }],
      recipient: req.recipient,
    },
  };

  const token = await getAccessToken(creds);
  const response = await fetch(`${baseForEnv()}/v1/quote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteData),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Turn 14 quote failed (${response.status}): ${err}`);
  }
  return response.json();
}

// ===== DROPSHIP ORDER =====

export interface DropshipOrderRequest {
  poNumber: string;
  items: Array<{ itemId: string; quantity: number }>;
  shippingCode?: number;
  recipient: DropshipQuoteRequest['recipient'];
  acknowledgeProp65?: boolean;
  acknowledgeEpa?: boolean;
  acknowledgeCarb?: boolean;
}

export async function createDropshipOrder(req: DropshipOrderRequest, creds: Credentials): Promise<unknown> {
  const orderData = {
    data: {
      environment: baseForEnv() === T14_TESTING_BASE ? 'testing' : 'production',
      po_number: req.poNumber,
      locations: [{
        location: 'default',
        combine_in_out_stock: true,
        items: req.items.map(i => ({
          item_identifier: i.itemId,
          item_identifier_type: 'item_id',
          quantity: i.quantity,
        })),
        ...(req.shippingCode ? { shipping: { shipping_code: req.shippingCode } } : {}),
      }],
      acknowledge_prop_65: req.acknowledgeProp65 ?? false,
      acknowledge_epa: req.acknowledgeEpa ?? false,
      acknowledge_carb: req.acknowledgeCarb ?? false,
      recipient: req.recipient,
    },
  };

  const token = await getAccessToken(creds);
  const response = await fetch(`${baseForEnv()}/v1/order`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Turn 14 order failed (${response.status}): ${err}`);
  }
  return response.json();
}

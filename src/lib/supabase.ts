// Supabase client for Mustang Magic shop
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let anonClientCache: any = null;
let adminClientCache: any = null;

function getAnonClient(): any | null {
  if (!supabaseUrl) return null;
  if (anonClientCache) return anonClientCache;
  const { createClient } = require('@supabase/supabase-js');
  anonClientCache = createClient(supabaseUrl, supabaseAnonKey || '');
  return anonClientCache;
}

function getAdminClient(): any | null {
  if (!supabaseUrl) return null;
  if (adminClientCache) return adminClientCache;
  if (!serviceRoleKey) return null;
  const { createClient } = require('@supabase/supabase-js');
  adminClientCache = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  return adminClientCache;
}

export const supabase = getAnonClient();
export const supabaseAdmin = getAdminClient();

// Direct REST fetch helper (works without Supabase JS client)
async function restFetch(path: string, opts?: { method?: string; body?: any; useServiceRole?: boolean }): Promise<{ ok: boolean; data: any; status: number }> {
  const url = `${supabaseUrl}/rest/v1${path.startsWith('/') ? '' : '/'}${encodeURIComponent(path)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (opts?.useServiceRole && serviceRoleKey) {
    headers['apikey'] = serviceRoleKey;
    headers['Authorization'] = `Bearer ${serviceRoleKey}`;
  } else if (supabaseAnonKey) {
    headers['apikey'] = supabaseAnonKey;
    headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
  } else {
    return { ok: false, data: null, status: 401 };
  }

  let res: Response;
  try {
    const fetchOpts: any = { headers };
    if (opts?.method) fetchOpts.method = opts.method;
    if (opts?.body) fetchOpts.body = JSON.stringify(opts.body);
    res = await fetch(url, fetchOpts);
  } catch (e) {
    return { ok: false, data: null, status: 0 };
  }

  let data: any;
  try { data = await res.json(); } catch { data = await res.text(); }

  return { ok: res.ok, data, status: res.status };
}

// Build REST query params from a filters object
function buildQueryParams(filters: Record<string, string | number | boolean | (string | number)[]>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(filters)) {
    if (val === undefined || val === null) continue;
    let encodedVal: string;
    if (Array.isArray(val)) {
      encodedVal = `(${val.map((v: any) => `'${v}'`).join(',')})`;
    } else if (typeof val === 'boolean') {
      encodedVal = `eq.${val}`;
    } else {
      encodedVal = `${val}`;
    }
    parts.push(`${key}=${encodeURIComponent(encodedVal)}`);
  }
  return parts.join('&');
}

// -----------------------------------------------------------
// Product queries
// -----------------------------------------------------------
export async function getProducts(
  filters?: {
    categorySlug?: string;
    brandSlug?: string;
    year?: number;
    make?: string;
    model?: string;
    generation?: string;
    bodyStyle?: string;
    engine?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
    limit?: number;
    search?: string;
  }
) {
  // Use anon client for reads (RLS allows public read access)
  const url = `${supabaseUrl}/rest/v1/products`;
  
  // Base select: include all needed fields + brand lookup via join
  const selectFields = 'id,sku,name,short_description,long_description,price,map_price,list_price,purchase_cost,active,images,turn14_item_id,brand_id,category_id,subcategory_id';
  
  let queryParts: string[] = [`select=${encodeURIComponent(selectFields)}`, 'active=eq.true'];

  // Category filter: resolve top-level + subcategories
  if (filters?.categorySlug) {
    const catRes = await restFetch(`/categories?slug=eq.${encodeURIComponent(filters.categorySlug)}&parent_id.is=null`);
    if (!catRes.ok || !catRes.data?.length) return [];
    const parentCatId = catRes.data[0].id;
    
    const subRes = await restFetch(`/categories?select=id,parent_id=eq.${encodeURIComponent(parentCatId)}`);
    let categoryIds = [parentCatId];
    if (subRes.ok && subRes.data?.length) {
      categoryIds.push(...(subRes.data as any[]).map((c: any) => c.id));
    }
    
    const idsStr = categoryIds.map((id: string) => `'${id}'`).join(',');
    queryParts.push(`subcategory_id=in.(${idsStr})`);
    queryParts.push(`category_id=in.(${idsStr})`);
  }

  // Brand filter
  if (filters?.brandSlug) {
    const brandRes = await restFetch(`/brands?slug=eq.${encodeURIComponent(filters.brandSlug)}`);
    if (!brandRes.ok || !brandRes.data?.length) return [];
    queryParts.push(`brand_id=eq.${encodeURIComponent((brandRes.data as any[])[0].id)}`);
  }

  // YMM fitment filter
  if (filters?.year && filters?.generation) {
    const fitRes = await restFetch(`/product_fitments?select=product_id&year=eq.${filters.year}&generation=eq.${encodeURIComponent(filters.generation)}`);
    if (!fitRes.ok || !fitRes.data?.length) return [];
    const idsStr = (fitRes.data as any[]).map((f: any) => `'${f.product_id}'`).join(',');
    queryParts.push(`id=in.(${idsStr})`);
  }

  // Search - use ILIKE via raw filter param
  if (filters?.search) {
    const searchStr = filters.search.replace(/['\\]/g, '');
    // Supabase REST supports multiple OR queries — we need to combine them manually
    // Since OR is tricky with multiple ilike conditions, use a single approach: 
    queryParts.push(`name=ilike.%${searchStr}%`);
  }

  // Sort
  let sortBy = 'updated_at';
  let sortDir = 'desc';
  if (filters?.sortBy === 'price_asc') { sortBy = 'price'; sortDir = 'asc'; }
  else if (filters?.sortBy === 'price_desc') { sortBy = 'price'; sortDir = 'desc'; }
  else if (filters?.sortBy === 'name') { sortBy = 'name'; sortDir = 'asc'; }
  queryParts.push(`order=${sortBy}.${sortDir}`);

  // Limit
  const limit = filters?.limit || 50;
  queryParts.push(`limit=${limit}`);

  const queryString = queryParts.join('&');
  
  const res = await restFetch(`/products?${queryString}`, { method: 'GET' });
  if (!res.ok) return [];
  
  const products = res.data as any[];

  // Fetch brand names and categories in bulk to avoid N+1
  const allBrandsRes = await restFetch('/brands?select=id,name');
  let brandsMap: Record<string, string> = {};
  if (allBrandsRes.ok && allBrandsRes.data?.length) {
    for (const b of allBrandsRes.data as any[]) brandsMap[b.id] = b.name;
  }

  const allCatsRes = await restFetch('/categories?select=id,name');
  let catMap: Record<string, string> = {};
  if (allCatsRes.ok && allCatsRes.data?.length) {
    for (const c of allCatsRes.data as any[]) catMap[c.id] = c.name;
  }

  // Fetch all fitments in one query
  const productIds = products.map((p: any) => p.id);
  let fitsMap: Record<string, any[]> = {};
  if (productIds.length > 0) {
    const pidStr = productIds.map((id: string) => `'${id}'`).join(',');
    const fitRes = await restFetch(`/product_fitments?select=year,generation,body_style,engine&product_id=in.(${pidStr})`);
    if (fitRes.ok && fitRes.data?.length) {
      for (const f of fitRes.data as any[]) {
        if (!fitsMap[f.product_id]) fitsMap[f.product_id] = [];
        fitsMap[f.product_id].push({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine });
      }
    }
  }

  // Transform to frontend format
  return products.map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    shortDescription: p.short_description || '',
    longDescription: p.long_description || '',
    price: p.price ?? 0,
    mapPrice: p.map_price ?? 0,
    listPrice: p.list_price ?? 0,
    purchaseCost: p.purchase_cost ?? undefined,
    brandName: brandsMap[p.brand_id] || 'Unknown',
    category: catMap[p.category_id] || '',
    subcategory: catMap[p.subcategory_id] || '',
    imageUrl: (() => { 
      try { const images = JSON.parse(p.images || '[]'); return images.find((i: any) => i.primary)?.url || ''; } catch { return ''; }
    })(),
    imageUrls: [],
    active: p.active,
    inStock: true,
    fitments: fitsMap[p.id] || [],
  }));
}

// -----------------------------------------------------------
// Single product by ID or SKU
// -----------------------------------------------------------
export async function getProductById(id: string) {
  const res = await restFetch(`/products?id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!res.ok || !res.data?.length) return null;
  return (res.data as any[])[0] || null;
}

export async function getProductBySku(sku: string) {
  const res = await restFetch(`/products?sku=eq.${encodeURIComponent(sku)}&limit=1`);
  if (!res.ok || !res.data?.length) return null;
  return (res.data as any[])[0] || null;
}

// -----------------------------------------------------------
// Category and brand lookups
// -----------------------------------------------------------
export async function getCategories(includeInactive = false) {
  let path = '/categories?select=*&order=sort_order';
  if (!includeInactive) path += '&is_active=eq.true';
  const res = await restFetch(path);
  return res.ok ? (res.data as any[]) : [];
}

export async function getBrands() {
  const res = await restFetch('/brands?select=*&is_active=eq.true&order=name');
  return res.ok ? (res.data as any[]) : [];
}

// -----------------------------------------------------------
// Cart session operations
// -----------------------------------------------------------
export async function createCartSession(email?: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const res = await restFetch('/cart_sessions', {
    method: 'POST',
    body: { session_token: token, customer_email: email || null, expires_at: expiresAt },
  });
  if (!res.ok) return null;
  return res.data;
}

export async function addToCartSession(sessionToken: string, productId: string, quantity = 1) {
  const res = await restFetch(`/cart_items?select=quantity&session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`);
  if (!res.ok) return { success: false };
  
  let targetUrl = `/cart_items?session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`;
  const body = res.data?.length > 0
    ? JSON.stringify({ quantity: (res.data as any[])[0].quantity + quantity, updated_at: new Date().toISOString() })
    : JSON.stringify({ session_token: sessionToken, product_id: productId, quantity });

  const putRes = await restFetch(targetUrl, { method: res.data?.length > 0 ? 'PATCH' : 'POST', body: body ? JSON.parse(body) : body });
  return { success: putRes.ok };
}

export async function getCartSession(token: string) {
  const sessionRes = await restFetch(`/cart_sessions?session_token=eq.${encodeURIComponent(token)}`);
  if (!sessionRes.ok || !sessionRes.data?.length) return null;
  if ((sessionRes.data as any[])[0].status !== 'active') return null;

  const itemsRes = await restFetch(`/cart_items?select=*,product:products!product_id(id,sku,name,short_description,price)&session_token=eq.${encodeURIComponent(token)}`);
  if (!itemsRes.ok) return null;

  return { session: (sessionRes.data as any[])[0], items: itemsRes.data || [] };
}

export async function removeFromCartSession(token: string, productId: string) {
  await restFetch(`/cart_items?session_token=eq.${encodeURIComponent(token)}&product_id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE' });
}

export async function clearCartSession(token: string) {
  const url = `/cart_sessions?session_token=eq.${encodeURIComponent(token)}`;
  await restFetch(url, { 
    method: 'PATCH', 
    body: { status: 'expired', updated_at: new Date().toISOString() } 
  });
}

// -----------------------------------------------------------
// Order operations (service role for writes)
// -----------------------------------------------------------
export async function createOrder(data: { customer_name: string; customer_email: string; customer_phone?: string; subtotal: number; shipping: number; tax: number; total: number; notes?: string; stripe_session_id?: string }) {
  const res = await restFetch('/orders', { method: 'POST', body: data, useServiceRole: true });
  if (!res.ok) return null;
  return res.data;
}

export async function addOrderItems(orderId: string, items: Array<{ product_id?: string; sku: string; product_name: string; quantity: number; unit_price: number }>) {
  const rows = items.map(i => ({ order_id: orderId, product_id: i.product_id || null, sku: i.sku, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, total_price: Number((i.unit_price * i.quantity).toFixed(2)) }));
  const res = await restFetch('/order_items', { method: 'POST', body: rows, useServiceRole: true });
  if (!res.ok) return [];
  return res.data;
}

export async function addOrderAddress(orderId: string, address: { address_type: 'shipping' | 'billing'; first_name?: string; last_name?: string; company?: string; address1: string; address2?: string; city: string; state: string; zip: string; country?: string; phone?: string }) {
  const res = await restFetch('/order_addresses', { method: 'POST', body: { ...address, order_id: orderId }, useServiceRole: true });
  if (!res.ok) return null;
  return res.data;
}

// Supabase client for Mustang Magic shop
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAuthHeaders(useServiceRole?: boolean) {
  const key = useServiceRole && serviceRoleKey ? serviceRoleKey : supabaseAnonKey;
  if (!key) throw new Error('Supabase API key not configured');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function restFetch(path: string, opts?: { method?: string; body?: any; useServiceRole?: boolean }): Promise<{ ok: boolean; data: any }> {
  const url = new URL(`${supabaseUrl}/rest/v1/${path.startsWith('/') ? '' : ''}${encodeURIComponent(path)}`);

  return fetch(url.toString(), {
    method: opts?.method || 'GET',
    headers: getAuthHeaders(opts?.useServiceRole),
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  }).then(async (res) => {
    let data: any;
    try { data = await res.json(); } catch { data = await res.text(); }
    return { ok: res.ok, data };
  });
}

// Helper to build query params using URLSearchParams (avoids double-encoding issues)
function appendQuery(url: string, key: string, value: string | number | boolean | (string | number)[]): string {
  const parsed = new URL(url);
  
  // Handle special Supabase operators
  if (typeof value === 'boolean') {
    parsed.searchParams.set(key, `eq.${value}`);
  } else if (Array.isArray(value)) {
    const ids = value.map((v: string | number) => `'${v}'`).join(',');
    parsed.searchParams.set(key, `in.(${ids})`);
  } else {
    parsed.searchParams.set(key, `${value}`);
  }
  
  return parsed.toString();
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
  let url = `${supabaseUrl}/rest/v1/products`;

  // Select fields
  const selectFields = 'id,sku,name,short_description,long_description,price,map_price,list_price,purchase_cost,active,images,turn14_item_id,brand_id,category_id,subcategory_id';
  const parsed = new URL(url);
  parsed.searchParams.set('select', selectFields);

  // Active filter
  parsed.searchParams.set('active', 'eq.true');

  // Category filter
  if (filters?.categorySlug) {
    const catRes = await restFetch(`categories?slug=eq.${encodeURIComponent(filters.categorySlug)}&parent_id.is=null`);
    if (!catRes.ok || !catRes.data?.length) return [];
    const parentCatId = catRes.data[0].id;

    // Get subcategory IDs
    const subRes = await restFetch(`categories?select=id&parent_id=eq.${encodeURIComponent(parentCatId)}`);
    let categoryIds = [parentCatId];
    if (subRes.ok && subRes.data?.length) {
      categoryIds.push(...(subRes.data as any[]).map((c: any) => c.id));
    }

    url = parsed.toString();
    const u1 = new URL(url);
    const idsStr = categoryIds.map((id: string) => `'${id}'`).join(',');
    u1.searchParams.set('subcategory_id', `in.(${idsStr})`);
    url = u1.toString();

    // Also filter by parent category_id
    const u2 = new URL(url);
    u2.searchParams.set('category_id', `in.(${idsStr})`);
    url = u2.toString();
  }

  // Brand filter
  if (filters?.brandSlug) {
    const brandRes = await restFetch(`brands?slug=eq.${encodeURIComponent(filters.brandSlug)}`);
    if (!brandRes.ok || !brandRes.data?.length) return [];
    url = appendQuery(url, 'brand_id', (brandRes.data as any[])[0].id);
  }

  // YMM fitment filter
  if (filters?.year && filters?.generation) {
    const fitRes = await restFetch(`product_fitments?select=product_id&year=eq.${filters.year}&generation=eq.${encodeURIComponent(filters.generation)}`);
    if (!fitRes.ok || !fitRes.data?.length) return [];
    url = appendQuery(url, 'id', (fitRes.data as any[]).map((f: any) => f.product_id));
  }

  // Search - ILIKE via Supabase REST operator
  if (filters?.search) {
    const u3 = new URL(url);
    const searchStr = filters.search.replace(/['\\]/g, '');
    u3.searchParams.set('name', `ilike.%${searchStr}%`);
    url = u3.toString();
  }

  // Sort
  let sortBy = 'updated_at';
  let sortDir = 'desc';
  if (filters?.sortBy === 'price_asc') { sortBy = 'price'; sortDir = 'asc'; }
  else if (filters?.sortBy === 'price_desc') { sortBy = 'price'; sortDir = 'desc'; }
  else if (filters?.sortBy === 'name') { sortBy = 'name'; sortDir = 'asc'; }

  const u4 = new URL(url);
  u4.searchParams.set('order', `${sortBy}.${sortDir}`);
  url = u4.toString();

  // Limit
  const limit = filters?.limit || 50;
  const finalUrl = new URL(url);
  finalUrl.searchParams.set('limit', String(limit));

  const res = await restFetch(finalUrl.pathname + '?' + finalUrl.search.slice(1), { method: 'GET' });
  if (!res.ok || !res.data?.length) return [];

  // Fetch brand names and categories in bulk
  const allBrandsRes = await restFetch('brands?select=id,name');
  let brandsMap: Record<string, string> = {};
  if (allBrandsRes.ok && allBrandsRes.data?.length) {
    for (const b of allBrandsRes.data as any[]) brandsMap[b.id] = b.name;
  }

  const allCatsRes = await restFetch('categories?select=id,name');
  let catMap: Record<string, string> = {};
  if (allCatsRes.ok && allCatsRes.data?.length) {
    for (const c of allCatsRes.data as any[]) catMap[c.id] = c.name;
  }

  // Fetch all fitments in one query
  const products = res.data as any[];
  const productIds = products.map((p: any) => p.id);
  let fitsMap: Record<string, any[]> = {};
  if (productIds.length > 0) {
    const pidStr = productIds.map((id: string) => `'${id}'`).join(',');
    const fitRes = await restFetch(`product_fitments?select=year,generation,body_style,engine&product_id=in.(${pidStr})`);
    if (fitRes.ok && fitRes.data?.length) {
      for (const f of fitRes.data as any[]) {
        if (!fitsMap[f.product_id]) fitsMap[f.product_id] = [];
        fitsMap[f.product_id].push({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine });
      }
    }
  }

  return products.map((p: any) => ({
    id: p.id, sku: p.sku, name: p.name,
    shortDescription: p.short_description || '', longDescription: p.long_description || '',
    price: p.price ?? 0, mapPrice: p.map_price ?? 0, listPrice: p.list_price ?? 0,
    purchaseCost: p.purchase_cost ?? undefined, brandName: brandsMap[p.brand_id] || 'Unknown',
    category: catMap[p.category_id] || '', subcategory: catMap[p.subcategory_id] || '',
    imageUrl: (() => { try { const images = JSON.parse(p.images || '[]'); return images.find((i: any) => i.primary)?.url || ''; } catch { return ''; } })(),
    imageUrls: [], active: p.active, inStock: true,
    fitments: fitsMap[p.id] || [],
  }));
}

// -----------------------------------------------------------
// Single product by ID or SKU
// -----------------------------------------------------------
export async function getProductById(id: string) {
  const res = await restFetch(`products?id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!res.ok || !res.data?.length) return null;
  return (res.data as any[])[0] || null;
}

export async function getProductBySku(sku: string) {
  const res = await restFetch(`products?sku=eq.${encodeURIComponent(sku)}&limit=1`);
  if (!res.ok || !res.data?.length) return null;
  return (res.data as any[])[0] || null;
}

// -----------------------------------------------------------
// Category and brand lookups
// -----------------------------------------------------------
export async function getCategories(includeInactive = false) {
  let path = 'categories?select=*&order=sort_order';
  if (!includeInactive) path += '&is_active=eq.true';
  const res = await restFetch(path);
  return res.ok ? (res.data as any[]) : [];
}

export async function getBrands() {
  const res = await restFetch('brands?select=*&is_active=eq.true&order=name');
  return res.ok ? (res.data as any[]) : [];
}

// -----------------------------------------------------------
// Cart session operations
// -----------------------------------------------------------
export async function createCartSession(email?: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const res = await restFetch('cart_sessions', { method: 'POST', body: { session_token: token, customer_email: email || null, expires_at: expiresAt }, useServiceRole: true });
  return res.ok ? res.data : null;
}

export async function addToCartSession(sessionToken: string, productId: string, quantity = 1) {
  const res = await restFetch(`cart_items?select=quantity&session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`);
  if (!res.ok) return { success: false };

  const isPatch = res.data?.length > 0;
  const path = `cart_items?session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`;
  const body = isPatch ? JSON.stringify({ quantity: (res.data as any[])[0].quantity + quantity, updated_at: new Date().toISOString() }) : JSON.stringify({ session_token: sessionToken, product_id: productId, quantity });
  const putRes = await restFetch(path, { method: isPatch ? 'PATCH' : 'POST', body: JSON.parse(body) });
  return { success: putRes.ok };
}

export async function getCartSession(token: string) {
  const sessionRes = await restFetch(`cart_sessions?session_token=eq.${encodeURIComponent(token)}`);
  if (!sessionRes.ok || !sessionRes.data?.length) return null;
  if ((sessionRes.data as any[])[0].status !== 'active') return null;

  const itemsRes = await restFetch(`cart_items?select=*,product:products!product_id(id,sku,name,short_description,price)&session_token=eq.${encodeURIComponent(token)}`);
  if (!itemsRes.ok) return null;
  return { session: (sessionRes.data as any[])[0], items: itemsRes.data || [] };
}

export async function removeFromCartSession(token: string, productId: string) {
  await restFetch(`cart_items?session_token=eq.${encodeURIComponent(token)}&product_id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE' });
}

export async function clearCartSession(token: string) {
  const url = `cart_sessions?session_token=eq.${encodeURIComponent(token)}`;
  await restFetch(url, { method: 'PATCH', body: { status: 'expired', updated_at: new Date().toISOString() }, useServiceRole: true });
}

// -----------------------------------------------------------
// Order operations (service role for writes)
// -----------------------------------------------------------
export async function createOrder(data: { customer_name: string; customer_email: string; customer_phone?: string; subtotal: number; shipping: number; tax: number; total: number; notes?: string; stripe_session_id?: string }) {
  const res = await restFetch('orders', { method: 'POST', body: data, useServiceRole: true });
  return res.ok ? res.data : null;
}

export async function addOrderItems(orderId: string, items: Array<{ product_id?: string; sku: string; product_name: string; quantity: number; unit_price: number }>) {
  const rows = items.map(i => ({ order_id: orderId, product_id: i.product_id || null, sku: i.sku, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, total_price: Number((i.unit_price * i.quantity).toFixed(2)) }));
  const res = await restFetch('order_items', { method: 'POST', body: rows, useServiceRole: true });
  return res.ok ? (res.data as any[]) : [];
}

export async function addOrderAddress(orderId: string, address: { address_type: 'shipping' | 'billing'; first_name?: string; last_name?: string; company?: string; address1: string; address2?: string; city: string; state: string; zip: string; country?: string; phone?: string }) {
  const res = await restFetch('order_addresses', { method: 'POST', body: { ...address, order_id: orderId }, useServiceRole: true });
  return res.ok ? res.data : null;
}

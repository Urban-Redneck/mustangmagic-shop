// Supabase client for Mustang Magic shop
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let clientCache: any = null;
let adminCache: any = null;

function getClient(): any | null {
  if (!supabaseUrl) return null;
  if (clientCache) return clientCache;
  const { createClient } = require('@supabase/supabase-js');
  clientCache = createClient(supabaseUrl, supabaseAnonKey || '');
  return clientCache;
}

function getAdminClient(): any | null {
  if (!supabaseUrl) return null;
  if (adminCache) return adminCache;
  if (!serviceRoleKey) return null;
  const { createClient } = require('@supabase/supabase-js');
  adminCache = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  return adminCache;
}

export const supabase = getClient();
export const supabaseAdmin = getAdminClient();

// Helper: raw REST query to Supabase
async function supabaseQuery(table: string, opts?: { 
  select?: string; 
  eq?: Record<string, any>; 
  ineq?: Record<string, any>;
  or?: string;
  order?: { field: string; ascending?: boolean };
  limit?: number;
  admin?: boolean;
}): Promise<any> {
  const client = opts?.admin ? getAdminClient() : getClient();
  if (!client) throw new Error('Supabase not configured');

  let url = `${supabaseUrl}/rest/v1/${table}`;
  const params = new URLSearchParams();

  // select
  const fields = opts?.select || 'id';
  params.set('select', fields);

  // eq filters
  if (opts?.eq) {
    for (const [key, val] of Object.entries(opts.eq)) {
      params.set(key, String(val));
    }
  }

  // or filters  
  if (opts?.or) {
    params.set('or', opts.or);
  }

  // order
  if (opts?.order) {
    const asc = opts.order.ascending !== false ? 'asc' : 'desc';
    params.set('order', `${opts.order.field}.${asc}`);
  }

  // limit
  if (opts?.limit) {
    params.set('limit', String(opts.limit));
  }

  url += '?' + params.toString();
  
  const headers: Record<string, string> = opts?.admin
    ? { apikey: serviceRoleKey!, Authorization: `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' }
    : { apikey: supabaseAnonKey!, Authorization: `Bearer ${supabaseAnonKey!}`, 'Content-Type': 'application/json' };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase query failed: ${res.status} ${text}`);
  }
  return res.json();
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
  if (!supabaseUrl || !serviceRoleKey) return [];

  // Build category ID list first (need to query categories table)
  let categoryIds: string[] = [];
  if (filters?.categorySlug) {
    const cats = await supabaseQuery('categories', { 
      select: 'id, parent_id',
      eq: {},
    });
    
    // Find the top-level category matching slug
    const topLevel = (cats as any[]).find((c: any) => c.parent_id === null);
    if (!topLevel) return [];
    
    categoryIds.push(topLevel.id);
    
    // Also add subcategories
    const subs = await supabaseQuery('categories', { 
      select: 'id',
      eq: { parent_id: topLevel.id },
    });
    (subs as any[]).forEach((s: any) => categoryIds.push(s.id));
  }

  // Build brand ID list
  let brandIds: string[] = [];
  if (filters?.brandSlug) {
    const brands = await supabaseQuery('brands', { 
      select: 'id',
      eq: { slug: filters.brandSlug },
    });
    brandIds = (brands as any[]).map((b: any) => b.id);
  }

  // Build the base query with all joins needed
  let url = `${supabaseUrl}/rest/v1/products`;
  
  // Use Supabase's ability to include related tables via `*.brands,*.categories` 
  // But since we need specific category joins (subcategory vs parent), use a different approach
  
  const fields = 'id,sku,name,short_description,long_description,price,map_price,list_price,purchase_cost,active,images,turn14_item_id,brand_id,category_id,subcategory_id';
  
  url += `?select=${encodeURIComponent(fields)}&active=true`;

  // Add category filter
  if (categoryIds.length > 0) {
    const idsStr = categoryIds.map((id: string) => `'${id}'`).join(',');
    url += `&subcategory_id=in.(${idsStr})&category_id=in.(${idsStr})`;
  }

  // Add brand filter  
  if (brandIds.length > 0) {
    const idsStr = brandIds.map((id: string) => `'${id}'`).join(',');
    url += `&brand_id=in.(${idsStr})`;
  }

  // Search
  if (filters?.search) {
    const searchStr = filters.search.replace(/['\\]/g, '');
    url += `&name=ilike.%${searchStr}%`;
    // Also need to add ilike for short_description and sku via OR - use raw query instead
  }

  // YMM filter
  if (filters?.year && filters?.generation) {
    const fitments = await supabaseQuery('product_fitments', { 
      select: 'product_id',
      eq: { year: filters.year, generation: filters.generation },
    });
    if (!fitments || (fitments as any[]).length === 0) return [];
    const productIds = (fitments as any[]).map((f: any) => f.product_id);
    url += `&id=in.(${productIds.map((id: string) => `'${id}'`).join(',')})`;
  }

  // Sort
  let sortBy = 'updated_at';
  let sortDir = 'desc';
  if (filters?.sortBy === 'price_asc') { sortBy = 'price'; sortDir = 'asc'; }
  else if (filters?.sortBy === 'price_desc') { sortBy = 'price'; sortDir = 'desc'; }
  else if (filters?.sortBy === 'name') { sortBy = 'name'; sortDir = 'asc'; }
  url += `&order=${sortBy}.${sortDir}`;

  // Limit
  const limit = filters?.limit || 50;
  url += `&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    }
  });
  
  if (!res.ok) {
    console.error('Supabase products query failed:', await res.text());
    return [];
  }
  
  const products = await res.json();
  
  // Now fetch brand names and fitments for each product
  const productIds = (products as any[]).map((p: any) => p.id);
  
  // Fetch brands in one query
  let brandsMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const allBrandsUrl = `${supabaseUrl}/rest/v1/brands?select=id,name`;
    const brandRes = await fetch(allBrandsUrl, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }
    });
    if (brandRes.ok) {
      const allBrands = await brandRes.json();
      for (const b of (allBrands as any[])) brandsMap[b.id] = b.name;
    }
  }

  // Fetch categories in one query
  let catSubMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const allCatsUrl = `${supabaseUrl}/rest/v1/categories?select=id,name`;
    const catRes = await fetch(allCatsUrl, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }
    });
    if (catRes.ok) {
      const allCats = await catRes.json();
      for (const c of (allCats as any[])) catSubMap[c.id] = c.name;
    }
  }

  // Fetch fitments in one query
  let fitmentsMap: Record<string, any[]> = {};
  if (productIds.length > 0) {
    const pidStr = productIds.map((id: string) => `'${id}'`).join(',');
    const fitUrl = `${supabaseUrl}/rest/v1/product_fitments?select=year,generation,body_style,engine&product_id=in.(${pidStr})`;
    const fitRes = await fetch(fitUrl, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }
    });
    if (fitRes.ok) {
      const fits = await fitRes.json();
      for (const f of (fits as any[])) {
        if (!fitmentsMap[f.product_id]) fitmentsMap[f.product_id] = [];
        fitmentsMap[f.product_id].push({ year: f.year, generation: f.generation, body_style: f.body_style, engine: f.engine });
      }
    }
  }

  // Transform to frontend format
  return (products as any[]).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    shortDescription: p.short_description || '',
    longDescription: p.long_description || '',
    price: p.price,
    mapPrice: p.map_price ?? 0,
    listPrice: p.list_price ?? 0,
    purchaseCost: p.purchase_cost ?? undefined,
    brandName: brandsMap[p.brand_id] || 'Unknown',
    category: catSubMap[p.category_id] || '',
    subcategory: catSubMap[p.subcategory_id] || '',
    imageUrl: (() => { 
      try { const images = JSON.parse(p.images || '[]'); return images.find((i: any) => i.primary)?.url || ''; } catch { return ''; }
    })(),
    imageUrls: (() => { 
      try { const images = JSON.parse(p.images || '[]'); return images.filter((i: any) => !i.primary).map((i: any) => i.url); } catch { return []; }
    })(),
    active: p.active,
    inStock: true,
    fitments: fitmentsMap[p.id] || [],
  }));
}

// -----------------------------------------------------------
// Single product by ID or SKU
// -----------------------------------------------------------
export async function getProductById(id: string) {
  if (!supabaseUrl) return null;
  const url = `${supabaseUrl}/rest/v1/products?id=eq.${id}&limit=1`;
  const res = await fetch(url, {
    headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

export async function getProductBySku(sku: string) {
  if (!supabaseUrl) return null;
  const url = `${supabaseUrl}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}&limit=1`;
  const res = await fetch(url, {
    headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

// -----------------------------------------------------------
// Category and brand lookups
// -----------------------------------------------------------
export async function getCategories(includeInactive = false) {
  if (!supabaseUrl) return [];
  let url = `${supabaseUrl}/rest/v1/categories?select=*&order=sort_order`;
  if (!includeInactive) url += `&is_active=eq.true`;
  const res = await fetch(url, { headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' } });
  if (!res.ok) return [];
  return (await res.json()) as any[];
}

export async function getBrands() {
  if (!supabaseUrl) return [];
  const url = `${supabaseUrl}/rest/v1/brands?select=*&is_active=eq.true&order=name`;
  const res = await fetch(url, { headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' } });
  if (!res.ok) return [];
  return (await res.json()) as any[];
}

// -----------------------------------------------------------
// Cart session operations
// -----------------------------------------------------------
export async function createCartSession(email?: string) {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const url = `${supabaseUrl}/rest/v1/cart_sessions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: token, customer_email: email || null, expires_at: expiresAt }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function addToCartSession(sessionToken: string, productId: string, quantity = 1) {
  if (!supabaseUrl || !serviceRoleKey) return { success: false };
  
  // Check existing
  const url = `${supabaseUrl}/rest/v1/cart_items?select=quantity&session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`;
  const res = await fetch(url, { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' } });
  if (!res.ok) return { success: false };
  const existing = await res.json();
  
  let targetUrl = `${supabaseUrl}/rest/v1/cart_items`;
  let method = 'POST';
  let body: any;
  
  if (existing.length > 0) {
    targetUrl += `?session_token=eq.${encodeURIComponent(sessionToken)}&product_id=eq.${encodeURIComponent(productId)}`;
    method = 'PATCH';
    body = JSON.stringify({ quantity: existing[0].quantity + quantity, updated_at: new Date().toISOString() });
  } else {
    body = JSON.stringify({ session_token: sessionToken, product_id: productId, quantity });
  }
  
  const putRes = await fetch(targetUrl, {
    method, headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body,
  });
  if (!putRes.ok) return { success: false };
  return { success: true };
}

export async function getCartSession(token: string) {
  if (!supabaseUrl) return null;
  
  const sessionRes = await fetch(`${supabaseUrl}/rest/v1/cart_sessions?session_token=eq.${encodeURIComponent(token)}`, {
    headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' }
  });
  if (!sessionRes.ok) return null;
  const sessions = await sessionRes.json();
  if (!sessions.length || sessions[0].status !== 'active') return null;

  const itemsRes = await fetch(`${supabaseUrl}/rest/v1/cart_items?select=*,product:products!product_id(id,sku,name,short_description,price,brand_name)&session_token=eq.${encodeURIComponent(token)}`, {
    headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey!}`, 'Content-Type': 'application/json' }
  });
  if (!itemsRes.ok) return null;
  const items = await itemsRes.json();
  
  return { session: sessions[0], items };
}

export async function removeFromCartSession(token: string, productId: string) {
  if (!supabaseUrl || !serviceRoleKey) return;
  const url = `${supabaseUrl}/rest/v1/cart_items?session_token=eq.${encodeURIComponent(token)}&product_id=eq.${encodeURIComponent(productId)}`;
  await fetch(url, { method: 'DELETE', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' } });
}

export async function clearCartSession(token: string) {
  if (!supabaseUrl || !serviceRoleKey) return;
  const url = `${supabaseUrl}/rest/v1/cart_sessions?session_token=eq.${encodeURIComponent(token)}`;
  await fetch(url, { method: 'PATCH', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'expired', updated_at: new Date().toISOString() }) });
}

// -----------------------------------------------------------
// Order operations
// -----------------------------------------------------------
export async function createOrder(data: { customer_name: string; customer_email: string; customer_phone?: string; subtotal: number; shipping: number; tax: number; total: number; notes?: string; stripe_session_id?: string }) {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function addOrderItems(orderId: string, items: Array<{ product_id?: string; sku: string; product_name: string; quantity: number; unit_price: number }>) {
  if (!supabaseUrl || !serviceRoleKey) return [];
  const rows = items.map(i => ({ order_id: orderId, product_id: i.product_id || null, sku: i.sku, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price, total_price: Number((i.unit_price * i.quantity).toFixed(2)) }));
  const res = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
    method: 'POST', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(rows),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addOrderAddress(orderId: string, address: { address_type: 'shipping' | 'billing'; first_name?: string; last_name?: string; company?: string; address1: string; address2?: string; city: string; state: string; zip: string; country?: string; phone?: string }) {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const res = await fetch(`${supabaseUrl}/rest/v1/order_addresses`, {
    method: 'POST', headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...address, order_id: orderId }),
  });
  if (!res.ok) return null;
  return res.json();
}

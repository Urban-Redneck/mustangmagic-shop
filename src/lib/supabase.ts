// Supabase client for Mustang Magic shop
// Uses lazy init so build succeeds without Supabase env vars configured.

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
  adminCache = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return adminCache;
}

export const supabase = getClient();
export const supabaseAdmin = getAdminClient();

// -----------------------------------------------------------
// Type-safe helper for querying products with fitment data
// -----------------------------------------------------------
export interface ProductWithFitment {
  id: string;
  sku: string;
  name: string;
  short_description: string;
  long_description: string;
  price: number;
  map_price: number | null;
  list_price: number | null;
  purchase_cost: number | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  active: boolean;
  images: Array<{ url: string; alt: string; primary: boolean }>;
  turn14_item_id: string | null;
  weight_lbs: number | null;
  fitments: Array<{
    year: number;
    make: string;
    model: string;
    generation: string;
    body_style: string | null;
    engine: string | null;
  }>;
}

// -----------------------------------------------------------
// Brand and category lookups
// -----------------------------------------------------------
export async function getCategories(includeInactive = false) {
  const client = getClient();
  if (!client) return [];
  let query = client.from('categories').select('*').eq('is_active', true).order('sort_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getBrands() {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('brands').select('*').eq('is_active', true).order('name');
  if (error) throw error;
  return data || [];
}

// -----------------------------------------------------------
// Product queries with optional YMM fitment filter
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
  const client = getClient();
  if (!client) return []; // Fallback to Turn 14

  let query = client
    .from('products')
    .select(`
      *,
      brand:brands!brand_id(name, slug),
      category:categories!category_id(name, slug, parent_id),
      subcategory:categories!subcategory_id(name, slug),
      fitments(
        year, make, model, generation, body_style, engine
      )
    `)
    .eq('active', true);

  if (filters?.categorySlug) {
    // Match subcategory or parent category slug
    const catResult = await client
      .from('categories')
      .select('id')
      .or(`slug.eq.${filters.categorySlug},parent_id.in.(select id from categories where slug='${filters.categorySlug}')`);

    if (catResult.data?.length) {
      const ids = catResult.data.map((c: any) => c.id as string);
      query = query.or(`subcategory_id.in.(${ids.map((i: string) => `'${i}'`).join(',')}),category_id.in.(${ids.map((i: string) => `'${i}'`).join(',')})`);
    }
  }

  if (filters?.brandSlug) {
    const brandResult = await client
      .from('brands')
      .select('id')
      .eq('slug', filters.brandSlug);
    if (brandResult.data?.length) {
      query = query.eq('brand_id', brandResult.data[0].id);
    }
  }

  if (filters?.year && filters?.generation) {
    // Filter by YMM via fitments relation
    const fitmentResult = await client
      .from('product_fitments')
      .select('product_id')
      .eq('year', filters.year)
      .eq('generation', filters.generation);

    if (fitmentResult.data?.length) {
      const productIds = fitmentResult.data.map((f: any) => f.product_id);
      query = query.in('id', productIds);
    } else {
      return []; // No matches for this YMM combo
    }
  }

  if (filters?.search) {
    const searchStr = filters.search.replace(/['\\]/g, '');
    query = query.or(`name.ilike.%${searchStr}%,short_description.ilike.%${searchStr}%,sku.ilike.%${searchStr}%`);
  }

  // Sort
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'price_asc': query = query.order('price', { ascending: true }); break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'name': query = query.order('name'); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
    }
  } else {
    query = query.order('updated_at', { ascending: false });
  }

  // Limit
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as any[];
}

// -----------------------------------------------------------
// Single product by SKU or ID
// -----------------------------------------------------------
export async function getProductById(id: string) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('products')
    .select(`
      *,
      brand:brands!brand_id(name, slug),
      category:categories!category_id(name, slug, parent_id),
      fitments(
        year, make, model, generation, body_style, engine
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data || null;
}

export async function getProductBySku(sku: string) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('products')
    .select(`
      *,
      brand:brands!brand_id(name, slug),
      category:categories!category_id(name, slug, parent_id),
      fitments(
        year, make, model, generation, body_style, engine
      )
    `)
    .eq('sku', sku)
    .single();

  if (error) throw error;
  return data || null;
}

// -----------------------------------------------------------
// Cart session operations (relational, not Redis-dependent)
// -----------------------------------------------------------
export async function createCartSession(email?: string) {
  const client = getClient();
  if (!client) return null;
  
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  const { data, error } = await client
    .from('cart_sessions')
    .insert({ session_token: token, customer_email: email || null, expires_at: expiresAt })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addToCartSession(sessionToken: string, productId: string, quantity = 1) {
  const client = getClient();
  if (!client) return { success: false };
  
  // Upsert cart item
  const { data: existing } = await client
    .from('cart_items')
    .select('quantity')
    .eq('session_token', sessionToken)
    .eq('product_id', productId)
    .single();

  if (existing) {
    const { error } = await client
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
      .match({ session_token: sessionToken, product_id: productId });
    if (error) throw error;
  } else {
    const { error } = await client
      .from('cart_items')
      .insert({ session_token: sessionToken, product_id: productId, quantity });
    if (error) throw error;
  }

  // Update total_items on cart session
  const { count } = await client
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('session_token', sessionToken);

  await client
    .from('cart_sessions')
    .update({ total_items: count || 0, updated_at: new Date().toISOString() })
    .eq('session_token', sessionToken);

  return { success: true };
}

export async function getCartSession(token: string) {
  const client = getClient();
  if (!client) return null;
  
  const { data: session } = await client
    .from('cart_sessions')
    .select('*')
    .eq('session_token', token)
    .single();

  if (!session || session.status !== 'active') return null;

  const { data: items, error } = await client
    .from('cart_items')
    .select(`
      *,
      product:products!product_id(id, sku, name, short_description, price, brand:brands!brand_id(name))
    `)
    .eq('session_token', token);

  if (error) throw error;
  return { session, items: items || [] };
}

export async function removeFromCartSession(token: string, productId: string) {
  const client = getClient();
  if (!client) return;
  
  const { error } = await client
    .from('cart_items')
    .delete()
    .match({ session_token: token, product_id: productId });
  if (error) throw error;
}

export async function clearCartSession(token: string) {
  const client = getClient();
  if (!client) return;
  
  const { error } = await client
    .from('cart_sessions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('session_token', token);
  if (error) throw error;
}

// -----------------------------------------------------------
// Order creation (for Stripe webhook + direct checkout)
// -----------------------------------------------------------
export async function createOrder(data: {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  notes?: string;
  stripe_session_id?: string;
}) {
  const adminClient = getAdminClient();
  if (!adminClient) return null;
  
  const { data: order, error } = await adminClient
    .from('orders')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return order;
}

export async function addOrderItems(orderId: string, items: Array<{
  product_id?: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}>) {
  const adminClient = getAdminClient();
  if (!adminClient) return [];
  
  const rows = items.map(i => ({
    order_id: orderId,
    product_id: i.product_id || null,
    sku: i.sku,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: Number((i.unit_price * i.quantity).toFixed(2)),
  }));

  const { data, error } = await adminClient
    .from('order_items')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function addOrderAddress(orderId: string, address: {
  address_type: 'shipping' | 'billing';
  first_name?: string;
  last_name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}) {
  const adminClient = getAdminClient();
  if (!adminClient) return null;
  
  const { data, error } = await adminClient
    .from('order_addresses')
    .insert({ ...address, order_id: orderId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -----------------------------------------------------------
// Cleanup: remove expired cart sessions (> 24h inactive)
// Run periodically via cron job
// -----------------------------------------------------------
export async function cleanupExpiredCarts() {
  const adminClient = getAdminClient();
  if (!adminClient) return 0;
  
  const { data } = await adminClient
    .from('cart_sessions')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('session_token');

  return data?.length || 0;
}

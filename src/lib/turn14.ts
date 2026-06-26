// Turn 14 Distribution API integration
// Uses OAuth2 client credentials flow with Turn 14's API
// Reference: DanZurita/Turn14-Api-Tool pattern, adapted for Node.js

const TURN14_API_BASE = 'https://api.turn14.com';

interface Credentials {
  clientId: string;
  clientSecret: string;
}

interface Turn14Product {
  id: string;
  sku: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  mapPrice: number; // Minimum Advertised Price
  listPrice: number;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  imageUrls: string[];
  inventory: number;
  inStock: boolean;
  yearMakeModel: Array<{ year: string; make: string; model: string }>;
}

interface InventoryItem {
  productId: string;
  sku: string;
  warehouseLocation: string;
  quantity: number;
  reserved: number;
  available: number;
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(creds: Credentials): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`${TURN14_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Turn 14 auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

async function authenticatedFetch(path: string, creds: Credentials, options?: RequestInit): Promise<Response> {
  const token = await getAccessToken(creds);
  return fetch(`${TURN14_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export async function getProductInventory(sku: string, creds: Credentials): Promise<InventoryItem | null> {
  const response = await authenticatedFetch(`/api/v1/inventory/sku/${encodeURIComponent(sku)}`, creds);
  if (!response.ok) return null;
  return response.json();
}

export async function searchProducts(
  year: string,
  make: string,
  model: string,
  keyword?: string,
  creds?: Credentials
): Promise<Turn14Product[]> {
  const params = new URLSearchParams({
    year,
    make,
    model,
    ...(keyword ? { keyword } : {}),
  });

  if (creds) {
    const response = await authenticatedFetch(`/api/v1/products/search?${params}`, creds);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.products || data) as Turn14Product[];
  }

  const response = await fetch(`${TURN14_API_BASE}/products?${params}`);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.products || data) as Turn14Product[];
}

export async function getMustangCategories(creds?: Credentials): Promise<Array<{ year: string; make: string; model: string }>> {
  if (creds) {
    const response = await authenticatedFetch('/api/v1/products/make-model-year?make=Ford&model=Mustang', creds);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || data;
  }

  const response = await fetch(`${TURN14_API_BASE}/products/make-model-year?make=Ford&model=Mustang`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.items || data;
}

export async function getProductBySku(sku: string, creds?: Credentials): Promise<Turn14Product | null> {
  if (creds) {
    const response = await authenticatedFetch(`/api/v1/products/sku/${encodeURIComponent(sku)}`, creds);
    if (!response.ok) return null;
    return response.json();
  }

  const response = await fetch(`${TURN14_API_BASE}/products/sku/${encodeURIComponent(sku)}`);
  if (!response.ok) return null;
  return response.json();
}

export async function syncMustangProducts(creds: Credentials): Promise<Turn14Product[]> {
  const products: Turn14Product[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await authenticatedFetch(
      `/api/v1/products?make=Ford&model=Mustang&page=${page}&per_page=${perPage}`,
      creds,
      { method: 'GET' }
    );

    if (!response.ok) break;
    const data = await response.json();
    const items = data.products || data.items || [];

    if (items.length === 0) break;

    for (const item of items as Turn14Product[]) {
      try {
        const inv = await getProductInventory(item.sku, creds);
        products.push({
          ...item,
          inventory: inv?.quantity ?? 0,
          inStock: (inv?.available ?? 0) > 0,
        });
      } catch {
        products.push(item);
      }
    }

    if (items.length < perPage) break;
    page++;
  }

  return products;
}

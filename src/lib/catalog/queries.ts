import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Brand,
  Category,
  MustangGeneration,
  ProductDetail,
  ProductFilters,
  ProductListItem,
} from "@/types/catalog";

type ProductRow = {
  id: string;
  slug: string;
  part_number: string;
  name: string;
  short_description: string | null;
  description?: string | null;
  primary_image_url: string | null;
  price: number | string | null;
  manual_price?: number | string | null;
  map_price?: number | string | null;
  msrp?: number | string | null;
  inventory_status: string;
  can_purchase?: boolean | null;
  brands: { name: string } | null;
};

type CategoryJoinRow = {
  categories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
};

type FitmentRow = {
  year: number;
  trim: string | null;
  engine: string | null;
  notes: string | null;
  mustang_generations: { name: string } | null;
};

type ProductImageRow = {
  id: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  is_primary: boolean;
};

type ShopNoteRow = {
  recommended: boolean;
  shop_notes: string | null;
  horsepower_gain: number | null;
  torque_gain: number | null;
  difficulty: number | null;
  labor_hours: number | string | null;
  tune_required: boolean;
  featured: boolean;
  last_updated: string;
};

type InstallTipRow = {
  id: string;
  tip: string;
  sort_order: number;
};

export async function getFeaturedProducts(limit = 8) {
  return getProducts({ limit });
}

export async function getProductSlugs(limit = 200) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.flatMap((product) => (product.slug ? [product.slug] : []));
}

export async function getProducts(filters: ProductFilters = {}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("products")
    .select(
      "id, slug, part_number, name, short_description, primary_image_url, price, manual_price, inventory_status, can_purchase, brands(name)",
    )
    .eq("active", true);

  const searchQuery = normalizeSearchQuery(filters.query);
  if (searchQuery) {
    const brandIds = await getBrandIdsForSearch(searchQuery);
    const searchPattern = `*${escapePostgrestPattern(searchQuery)}*`;
    const searchClauses = [
      `part_number.ilike.${searchPattern}`,
      `manufacturer_part_number.ilike.${searchPattern}`,
      `alternate_part_number.ilike.${searchPattern}`,
      `barcode.ilike.${searchPattern}`,
      `name.ilike.${searchPattern}`,
      `short_description.ilike.${searchPattern}`,
      `description.ilike.${searchPattern}`,
      `slug.ilike.${searchPattern}`,
    ];
    if (brandIds.length > 0) {
      searchClauses.push(`brand_id.in.(${brandIds.join(",")})`);
    }
    query = query.or(searchClauses.join(","));
  }

  if (filters.brand) {
    const brand = await getBrandBySlug(filters.brand);
    if (!brand) {
      return [];
    }
    query = query.eq("brand_id", brand.id);
  }

  if (filters.category) {
    const ids = await getProductIdsForCategory(filters.category);
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  if (filters.generation) {
    const ids = await getProductIdsForGeneration(filters.generation);
    if (ids.length === 0) {
      return [];
    }
    query = query.in("id", ids);
  }

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(filters.limit ?? 24)
    .returns<ProductRow[]>();
  if (error || !data) {
    return [];
  }

  const primaryImagesByProductId = await getPrimaryImagesForProducts(
    data.map((product) => product.id),
  );

  return data.map((product) =>
    mapProductListItem(product, primaryImagesByProductId.get(product.id)),
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, part_number, name, short_description, description, primary_image_url, price, manual_price, map_price, msrp, inventory_status, can_purchase, brands(name)",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<ProductRow>();

  if (error || !data) {
    return null;
  }

  const [categories, fitments, images, shopNotes, installTips] = await Promise.all([
    getCategoriesForProduct(data.id),
    getFitmentsForProduct(data.id),
    getImagesForProduct(data.id),
    getShopNotesForProduct(data.id),
    getInstallTipsForProduct(data.id),
  ]);

  return {
    ...mapProductListItem(data),
    description: data.description ?? null,
    mapPrice: toNumber(data.map_price ?? null),
    msrp: toNumber(data.msrp ?? null),
    images,
    shopNotes,
    installTips,
    categories,
    fitments,
  };
}

export async function getBrands(limit = 100): Promise<Brand[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url")
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logo_url,
  }));
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
  };
}

async function getBrandIdsForSearch(searchQuery: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", `%${searchQuery}%`)
    .limit(25);

  if (error || !data) {
    return [];
  }

  return data.flatMap((brand) => (brand.id ? [brand.id] : []));
}

export async function getCategories(limit = 100): Promise<Category[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
  }));
}

export async function getMustangGenerations(): Promise<MustangGeneration[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("mustang_generations")
    .select("id, slug, name, start_year, end_year, description")
    .order("sort_order", { ascending: true })
    .order("start_year", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((generation) => ({
    id: generation.id,
    slug: generation.slug,
    name: generation.name,
    startYear: generation.start_year,
    endYear: generation.end_year,
    description: generation.description,
  }));
}

async function getProductIdsForCategory(slug: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const category = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (category.error || !category.data) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_categories")
    .select("product_id")
    .eq("category_id", category.data.id);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.product_id);
}

async function getProductIdsForGeneration(slug: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const generation = await supabase
    .from("mustang_generations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (generation.error || !generation.data) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_fitments")
    .select("product_id")
    .eq("generation_id", generation.data.id);

  if (error || !data) {
    return [];
  }

  return Array.from(new Set(data.map((row) => row.product_id)));
}

async function getCategoriesForProduct(productId: string): Promise<Category[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_categories")
    .select("categories(id, name, slug, description)")
    .eq("product_id", productId)
    .returns<CategoryJoinRow[]>();

  if (error || !data) {
    return [];
  }

  return data.flatMap((row) => {
    if (!row.categories) {
      return [];
    }

    return {
      id: row.categories.id,
      name: row.categories.name,
      slug: row.categories.slug,
      description: row.categories.description,
    };
  });
}

async function getFitmentsForProduct(productId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_fitments")
    .select("year, trim, engine, notes, mustang_generations(name)")
    .eq("product_id", productId)
    .order("year", { ascending: true })
    .returns<FitmentRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map((fitment) => ({
    year: fitment.year,
    generationName: fitment.mustang_generations?.name ?? null,
    trim: fitment.trim,
    engine: fitment.engine,
    notes: fitment.notes,
  }));
}

async function getImagesForProduct(
  productId: string,
): Promise<ProductDetail["images"]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_images")
    .select("id, url, alt_text, width, height, is_primary")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ProductImageRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map((image) => ({
    id: image.id,
    url: image.url,
    altText: image.alt_text,
    width: image.width,
    height: image.height,
    isPrimary: image.is_primary,
  }));
}

async function getShopNotesForProduct(
  productId: string,
): Promise<ProductDetail["shopNotes"]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("product_shop_notes")
    .select(
      "recommended, shop_notes, horsepower_gain, torque_gain, difficulty, labor_hours, tune_required, featured, last_updated",
    )
    .eq("product_id", productId)
    .maybeSingle<ShopNoteRow>();

  if (error || !data) {
    return null;
  }

  return {
    recommended: data.recommended,
    shopNotes: data.shop_notes,
    horsepowerGain: data.horsepower_gain,
    torqueGain: data.torque_gain,
    difficulty: data.difficulty,
    laborHours: toNumber(data.labor_hours),
    tuneRequired: data.tune_required,
    featured: data.featured,
    lastUpdated: data.last_updated,
  };
}

async function getInstallTipsForProduct(
  productId: string,
): Promise<ProductDetail["installTips"]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_install_tips")
    .select("id, tip, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<InstallTipRow[]>();

  if (error || !data) {
    return [];
  }

  return data.map((tip) => ({
    id: tip.id,
    tip: tip.tip,
    sortOrder: tip.sort_order,
  }));
}

async function getPrimaryImagesForProducts(productIds: string[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase || productIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, url, is_primary, sort_order")
    .in("product_id", productIds)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .returns<
      Array<{
        product_id: string;
        url: string;
        is_primary: boolean;
        sort_order: number;
      }>
    >();

  if (error || !data) {
    return new Map<string, string>();
  }

  const primaryImages = new Map<string, string>();
  for (const image of data) {
    if (!primaryImages.has(image.product_id)) {
      primaryImages.set(image.product_id, image.url);
    }
  }

  return primaryImages;
}

function mapProductListItem(
  row: ProductRow,
  primaryImageUrl?: string,
): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    brandName: row.brands?.name ?? null,
    partNumber: row.part_number,
    name: row.name,
    shortDescription: row.short_description,
    primaryImageUrl: primaryImageUrl ?? displayableImageUrl(row.primary_image_url),
    price: effectivePrice(row),
    inventoryStatus: row.inventory_status,
    canPurchase: row.can_purchase === true,
  };
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function effectivePrice(row: ProductRow) {
  return toNumber(row.manual_price ?? null) ?? toNumber(row.price);
}

function normalizeSearchQuery(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 80);
}

function escapePostgrestPattern(value: string) {
  return value.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

function displayableImageUrl(url: string | null) {
  if (!url) {
    return null;
  }

  return url.toLowerCase().endsWith("-100.jpg") ? null : url;
}

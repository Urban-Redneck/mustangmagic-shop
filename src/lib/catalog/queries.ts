import { unstable_noStore as noStore } from "next/cache";
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
  map_price?: number | string | null;
  msrp?: number | string | null;
  inventory_status: string;
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

export async function getFeaturedProducts(limit = 8) {
  return getProducts({ limit });
}

export async function getProducts(filters: ProductFilters = {}) {
  noStore();

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("products")
    .select(
      "id, slug, part_number, name, short_description, primary_image_url, price, inventory_status, brands(name)",
    )
    .eq("active", true);

  if (filters.query) {
    query = query.textSearch("search_document", filters.query, {
      type: "websearch",
    });
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

  return data.map(mapProductListItem);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  noStore();

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, part_number, name, short_description, description, primary_image_url, price, map_price, msrp, inventory_status, brands(name)",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle<ProductRow>();

  if (error || !data) {
    return null;
  }

  const [categories, fitments] = await Promise.all([
    getCategoriesForProduct(data.id),
    getFitmentsForProduct(data.id),
  ]);

  return {
    ...mapProductListItem(data),
    description: data.description ?? null,
    mapPrice: toNumber(data.map_price ?? null),
    msrp: toNumber(data.msrp ?? null),
    categories,
    fitments,
  };
}

export async function getBrands(limit = 100): Promise<Brand[]> {
  noStore();

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
  noStore();

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

export async function getCategories(limit = 100): Promise<Category[]> {
  noStore();

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
  noStore();

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

function mapProductListItem(row: ProductRow): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    brandName: row.brands?.name ?? null,
    partNumber: row.part_number,
    name: row.name,
    shortDescription: row.short_description,
    primaryImageUrl: row.primary_image_url,
    price: toNumber(row.price),
    inventoryStatus: row.inventory_status,
  };
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

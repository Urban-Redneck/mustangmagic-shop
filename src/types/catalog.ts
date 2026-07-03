export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount?: number;
};

export type MustangGeneration = {
  id: string;
  slug: string;
  name: string;
  startYear: number;
  endYear: number | null;
  description: string | null;
  productCount?: number;
};

export type ProductListItem = {
  id: string;
  slug: string;
  brandName: string | null;
  partNumber: string;
  name: string;
  shortDescription: string | null;
  primaryImageUrl: string | null;
  price: number | null;
  inventoryStatus: string;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  mapPrice: number | null;
  msrp: number | null;
  categories: Category[];
  fitments: Array<{
    year: number;
    generationName: string | null;
    trim: string | null;
    engine: string | null;
    notes: string | null;
  }>;
};

export type ProductFilters = {
  query?: string;
  brand?: string;
  category?: string;
  generation?: string;
  limit?: number;
};

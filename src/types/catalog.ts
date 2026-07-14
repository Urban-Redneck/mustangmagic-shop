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
  canPurchase: boolean;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  mapPrice: number | null;
  msrp: number | null;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
    isPrimary: boolean;
  }>;
  shopNotes: {
    recommended: boolean;
    shopNotes: string | null;
    horsepowerGain: number | null;
    torqueGain: number | null;
    difficulty: number | null;
    laborHours: number | null;
    tuneRequired: boolean;
    featured: boolean;
    lastUpdated: string;
  } | null;
  installTips: Array<{
    id: string;
    tip: string;
    sortOrder: number;
  }>;
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

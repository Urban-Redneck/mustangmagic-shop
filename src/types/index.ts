export interface Product {
  id: string;
  sku: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  mapPrice: number;
  listPrice: number;
  brandName: string;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  inStock: boolean;
  yearMakeModel: { year: string; make: string; model: string }[];
}

export interface MMYFilter {
  year: string;
  make: string;
  model: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

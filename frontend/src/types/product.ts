import { PageResponse } from "./api";

/** Backend ProductDto — public katalog */
export interface Product {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  shortDescription: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  active: boolean;
  featured: boolean;
  stockStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ProductPage = PageResponse<Product>;

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number | null;
}

export interface PublicProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  page?: number;
  size?: number;
}

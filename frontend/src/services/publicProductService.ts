import { Product, ProductCategory, ProductPage, PublicProductFilters } from "@/types/product";

function apiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
}

async function publicFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${apiBase()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    const err = new Error("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.") as Error & {
      status?: number;
    };
    err.status = 0;
    throw err;
  }

  if (!response.ok) {
    let message = "İstek başarısız oldu";
    if (response.status === 404) {
      message = "Kayıt bulunamadı.";
    } else if (response.status >= 500) {
      message = "İşlem şu an tamamlanamadı. Lütfen daha sonra tekrar deneyin.";
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function buildQuery(filters: PublicProductFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 12));
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export const publicProductService = {
  getPage(filters: PublicProductFilters = {}, signal?: AbortSignal): Promise<ProductPage> {
    return publicFetch<ProductPage>(`/api/public/products?${buildQuery(filters)}`, signal);
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<Product> {
    return publicFetch<Product>(
      `/api/public/products/${encodeURIComponent(slug)}`,
      signal
    );
  },

  getFeatured(signal?: AbortSignal): Promise<Product[]> {
    return publicFetch<Product[]>("/api/public/products/featured", signal);
  },

  getCategories(signal?: AbortSignal): Promise<ProductCategory[]> {
    return publicFetch<ProductCategory[]>("/api/public/categories", signal);
  },
};

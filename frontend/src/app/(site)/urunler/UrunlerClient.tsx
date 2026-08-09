"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/site/Reveal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { publicProductService } from "@/services/publicProductService";
import type { Product, ProductCategory } from "@/types/product";

export default function UrunlerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [brandInput, setBrandInput] = useState(searchParams.get("brand") || "");
  const [brand, setBrand] = useState(searchParams.get("brand") || "");

  useEffect(() => {
    const cat = searchParams.get("category") || "";
    const br = searchParams.get("brand") || "";
    const q = searchParams.get("search") || "";
    setCategory(cat);
    setBrand(br);
    setBrandInput(br);
    setSearch(q);
    setSearchInput(q);
    setPage(0);
  }, [searchParams]);

  useEffect(() => {
    publicProductService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const syncQuery = useCallback(
    (next: { category?: string; brand?: string; search?: string }) => {
      const params = new URLSearchParams();
      const c = next.category ?? category;
      const b = next.brand ?? brand;
      const s = next.search ?? search;
      if (c) params.set("category", c);
      if (b) params.set("brand", b);
      if (s) params.set("search", s);
      const qs = params.toString();
      router.replace(qs ? `/urunler?${qs}` : "/urunler");
    },
    [router, category, brand, search]
  );

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const res = await publicProductService.getPage(
        {
          page,
          size: pageSize,
          category: category || undefined,
          brand: brand || undefined,
          search: search || undefined,
        },
        controller.signal
      );
      if (controller.signal.aborted) return;
      setItems(res.content ?? []);
      setTotalElements(res.totalElements ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch {
      if (controller.signal.aborted) return;
      setError("Ürünler yüklenemedi. Lütfen tekrar deneyin.");
      setItems([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, pageSize, category, brand, search]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Ürünler</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kataloğumuzdaki ürünleri inceleyin. Fiyatlar bilgilendirme amaçlıdır.
        </p>
      </Reveal>

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:grid-cols-3">
        <SearchInput
          value={searchInput}
          onChange={(v) => {
            setSearchInput(v);
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => {
              setPage(0);
              setSearch(v.trim());
              syncQuery({ search: v.trim() });
            }, 350);
          }}
          placeholder="Ürün, marka veya model ara…"
          className="md:col-span-3"
        />
        <Select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value);
            syncQuery({ category: e.target.value });
          }}
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <input
          type="text"
          value={brandInput}
          placeholder="Marka filtrele"
          className="field-base"
          onChange={(e) => {
            const v = e.target.value;
            setBrandInput(v);
            if (brandTimer.current) clearTimeout(brandTimer.current);
            brandTimer.current = setTimeout(() => {
              setPage(0);
              setBrand(v.trim());
              syncQuery({ brand: v.trim() });
            }, 350);
          }}
        />
        <button
          type="button"
          className="h-10 rounded-xl border border-slate-200 text-sm font-medium text-navy hover:bg-slate-50"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setCategory("");
            setBrand("");
            setBrandInput("");
            setPage(0);
            router.replace("/urunler");
          }}
        >
          Filtreleri Sıfırla
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
            Seçilen filtrelere uygun ürün bulunamadı.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                pageSizeOptions={[12, 24, 48]}
                onPageChange={(p) => setPage(p - 1)}
                onPageSizeChange={(size) => {
                  setPage(0);
                  setPageSize(size);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

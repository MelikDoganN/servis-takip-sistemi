import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import type { Product } from "@/types/product";
import { formatProductPrice, stockStatusLabel, stockStatusTone } from "@/lib/productLabels";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const price = formatProductPrice(product);
  const tone = stockStatusTone(product.stockStatus);

  return (
    <Link
      href={`/urunler/${product.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400">
            <MonitorSmartphone className="h-10 w-10" aria-hidden />
            <span className="text-xs font-medium">Görsel yakında</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {product.brand || "—"}
          </p>
          <Badge variant={tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "neutral"}>
            {stockStatusLabel(product.stockStatus)}
          </Badge>
        </div>
        <h3 className="mt-1 text-base font-semibold text-navy line-clamp-2">{product.name}</h3>
        {product.model && (
          <p className="mt-0.5 text-xs text-slate-500">Model: {product.model}</p>
        )}
        {product.categoryName && (
          <p className="mt-1 text-xs text-accent-strong">{product.categoryName}</p>
        )}
        {product.shortDescription && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <p className="text-sm font-semibold text-navy">
            {price ?? "Fiyat için iletişime geçin"}
          </p>
          <span className="text-xs font-medium text-accent-strong">Ürünü İncele →</span>
        </div>
      </div>
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { publicProductService } from "@/services/publicProductService";
import { formatProductPrice, stockStatusLabel, stockStatusTone } from "@/lib/productLabels";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await publicProductService.getBySlug(slug);
    return {
      title: `${product.name} | Servis Takip`,
      description:
        product.shortDescription ||
        product.description?.slice(0, 160) ||
        `${product.name} ürün detayı`,
    };
  } catch {
    return {
      title: "Ürün | Servis Takip",
      description: "Ürün detayı",
    };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  let product;
  try {
    product = await publicProductService.getBySlug(slug);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) notFound();
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-slate-600">Ürün bilgisi şu an yüklenemedi.</p>
        <Link href="/urunler" className="mt-4 inline-flex text-sm font-medium text-accent-strong">
          Kataloğa dön
        </Link>
      </div>
    );
  }

  const price = formatProductPrice(product);
  const tone = stockStatusTone(product.stockStatus);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/urunler" className="hover:text-navy">
          Ürünler
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="aspect-[4/3] bg-slate-100">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <MonitorSmartphone className="h-14 w-14" aria-hidden />
                <span className="text-sm">Görsel yakında</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-400">{product.brand || "—"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-navy">{product.name}</h1>
          {product.model && (
            <p className="mt-1 text-sm text-slate-500">Model: {product.model}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {product.categoryName && (
              <Badge variant="info">{product.categoryName}</Badge>
            )}
            <Badge
              variant={
                tone === "success"
                  ? "success"
                  : tone === "warning"
                    ? "warning"
                    : tone === "danger"
                      ? "danger"
                      : "neutral"
              }
            >
              {stockStatusLabel(product.stockStatus)}
            </Badge>
          </div>

          <p className="mt-6 text-2xl font-semibold text-navy">
            {price ?? "Fiyat için iletişime geçin"}
          </p>

          {product.shortDescription && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {product.shortDescription}
            </p>
          )}

          {product.description && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
              <h2 className="text-sm font-semibold text-navy">Ürün açıklaması</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/iletisim"
              className="inline-flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-medium text-white hover:bg-navy-soft"
            >
              Servisimizle İletişime Geç
            </Link>
            <Link
              href="/urunler"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-navy hover:bg-slate-50"
            >
              Kataloğa Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

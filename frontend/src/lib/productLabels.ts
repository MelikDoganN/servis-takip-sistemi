import type { Product } from "@/types/product";

const STOCK_LABELS: Record<string, string> = {
  AVAILABLE: "Stokta",
  IN_STOCK: "Stokta",
  LIMITED: "Sınırlı Stok",
  OUT_OF_STOCK: "Tükendi",
  MADE_TO_ORDER: "Siparişe Özel",
  CONTACT: "Bilgi için iletişim",
};

export function stockStatusLabel(status?: string | null): string {
  if (!status || !status.trim()) return "Bilgi için iletişim";
  const key = status.trim().toUpperCase();
  return STOCK_LABELS[key] || "Bilgi için iletişim";
}

export function stockStatusTone(
  status?: string | null
): "success" | "warning" | "danger" | "neutral" {
  switch ((status || "").toUpperCase()) {
    case "AVAILABLE":
    case "IN_STOCK":
      return "success";
    case "LIMITED":
    case "MADE_TO_ORDER":
      return "warning";
    case "OUT_OF_STOCK":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatProductPrice(product: Pick<Product, "price" | "currency">): string | null {
  if (product.price == null || Number.isNaN(Number(product.price))) {
    return null;
  }
  const currency = (product.currency || "TRY").toUpperCase();
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency === "TL" ? "TRY" : currency,
      maximumFractionDigits: 2,
    }).format(Number(product.price));
  } catch {
    return `${Number(product.price).toLocaleString("tr-TR")} ${currency}`;
  }
}

/** GET /api/public/warranty/{serialNumber} */
export interface PublicWarranty {
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  warrantyStatus?: string | null;
}

/** GET /api/public/service/{serviceNumber}?phone=… */
export interface PublicServiceStatus {
  serviceNumber?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  technicianName?: string | null;
  estimatedCompletionAt?: string | null;
  updatedAt?: string | null;
}

/** Public garanti durumu — ham enum gösterme. */
export function publicWarrantyStatusLabel(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "AKTIF":
      return "Garanti Devam Ediyor";
    case "SURESI_DOLMUS":
      return "Garanti Süresi Dolmuş";
    case "TARIH_EKSIK":
      return "Garanti Tarihi Eksik";
    case "TANIMLANMAMIS":
      return "Garanti Süresi Tanımlı Değil";
    default:
      return status?.trim() ? status : "Belirtilmedi";
  }
}

export const PUBLIC_SERVICE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  ASSIGNED: "Teknisyen Atandı",
  IN_PROGRESS: "İşlemde",
  WAITING_PARTS: "Parça Bekliyor",
  RESOLVED: "Teknik İşlem Tamamlandı",
  READY_FOR_DELIVERY: "Teslime Hazır",
  DELIVERED: "Teslim Edildi",
  CLOSED: "Kapatıldı",
  CANCELLED: "İptal Edildi",
};

/** Public servis durumu — ham enum gösterme. */
export function publicServiceStatusLabel(status?: string | null): string {
  if (!status?.trim()) return "Belirtilmedi";
  const key = status.trim().toUpperCase();
  return PUBLIC_SERVICE_STATUS_LABELS[key] ?? "Belirtilmedi";
}

export function publicDisplayValue(value?: string | null): string {
  if (value === null || value === undefined || value.trim() === "") {
    return "Belirtilmedi";
  }
  return value.trim();
}

export function publicFormatDate(value?: string | null): string {
  if (!value?.trim()) return "Belirtilmedi";
  const raw = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("tr-TR");
}

export function publicFormatDateTime(value?: string | null): string {
  if (!value?.trim()) return "Belirtilmedi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

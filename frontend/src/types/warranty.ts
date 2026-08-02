export type WarrantyType = "GENERAL" | "PARTS" | "LABOR";

export interface WarrantyRecord {
  id: number;
  device?: {
    id: number;
    serialNumber?: string;
  };
  warrantyType: string;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/warranty/device/{serialNumber} */
export interface WarrantyDeviceInfo {
  deviceName?: string | null;
  brand?: string | null;
  model?: string | null;
  customerName?: string | null;
  serialNumber?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  warrantyStatus?: string | null;
  serviceHistory?: Array<{
    workOrderId?: number;
    status?: string;
    description?: string;
    createdAt?: string;
  }> | null;
}

export function warrantyStatusLabel(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "AKTIF":
      return "Aktif";
    case "SURESI_DOLMUS":
      return "Süresi dolmuş";
    case "TARIH_EKSIK":
      return "Satın alma / kurulum tarihi eksik";
    case "TANIMLANMAMIS":
      return "Garanti süresi tanımlı değil";
    default:
      return status?.trim() ? status : "Bilinmiyor";
  }
}

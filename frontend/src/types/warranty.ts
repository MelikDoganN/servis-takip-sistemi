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

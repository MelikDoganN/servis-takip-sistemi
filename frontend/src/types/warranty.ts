import { Device } from "./device";

export type WarrantyType = "GENERAL" | "PARTS" | "LABOR";

export interface WarrantyRecord {
  id: number;
  device: Device;
  warrantyType: WarrantyType;
  startDate: string;
  endDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

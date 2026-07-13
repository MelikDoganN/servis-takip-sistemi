import { Brand } from "./brand";

export interface DeviceModel {
  id: number;
  brand: Brand;
  name: string;
  deviceType: string;
  generalWarrantyMonths: number;
  partsWarrantyMonths: number;
  laborWarrantyMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

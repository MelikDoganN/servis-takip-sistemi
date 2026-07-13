import { Customer } from "./customer";
import { DeviceModel } from "./deviceModel";

export interface Device {
  id: number;
  customer: Customer;
  model: DeviceModel;
  serialNumber: string;
  purchaseDate: string | null;
  installationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceRequest {
  customer: { id: number };
  model: { id: number };
  serialNumber: string;
  purchaseDate?: string;
  installationDate?: string;
}

export interface UpdateDeviceRequest {
  customer: { id: number };
  model: { id: number };
  serialNumber: string;
  purchaseDate?: string;
  installationDate?: string;
}

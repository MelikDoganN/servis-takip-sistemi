import { apiClient } from "./api";
import {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
} from "@/types/device";

export const deviceService = {
  getAll(): Promise<Device[]> {
    return apiClient<Device[]>("/api/devices");
  },

  getById(id: number): Promise<Device> {
    return apiClient<Device>(`/api/devices/${id}`);
  },

  create(data: CreateDeviceRequest): Promise<Device> {
    return apiClient<Device>("/api/devices", {
      method: "POST",
      body: data,
    });
  },

  update(id: number, data: UpdateDeviceRequest): Promise<Device> {
    return apiClient<Device>(`/api/devices/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  delete(id: number): Promise<void> {
    return apiClient<void>(`/api/devices/${id}`, {
      method: "DELETE",
    });
  },
};

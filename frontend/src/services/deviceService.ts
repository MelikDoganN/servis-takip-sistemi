import { apiClient } from "./api";
import {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
} from "@/types/device";
import { PageResponse } from "@/types/api";

function unwrapContent<T>(data: PageResponse<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

export const deviceService = {
  getPage(page = 0, size = 10): Promise<PageResponse<Device>> {
    return apiClient<PageResponse<Device>>(
      `/api/devices?page=${page}&size=${size}`
    );
  },

  async getAll(size = 1000): Promise<Device[]> {
    const data = await apiClient<PageResponse<Device> | Device[]>(
      `/api/devices?page=0&size=${size}`
    );
    return unwrapContent(data);
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

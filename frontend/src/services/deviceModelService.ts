import { apiClient } from "./api";
import { DeviceModel } from "@/types/deviceModel";

export const deviceModelService = {
  getAll(brandId?: number): Promise<DeviceModel[]> {
    const params = new URLSearchParams();
    if (brandId != null) params.set("brandId", String(brandId));
    const qs = params.toString();
    return apiClient<DeviceModel[]>(`/api/models${qs ? `?${qs}` : ""}`);
  },
};

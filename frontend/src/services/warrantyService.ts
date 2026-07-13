import { apiClient } from "./api";
import { WarrantyRecord, WarrantyType } from "@/types/warranty";

export const warrantyService = {
  check(deviceId: number, type: WarrantyType): Promise<boolean> {
    return apiClient<boolean>(`/api/warranty/check/${deviceId}/${type}`);
  },

  generate(deviceId: number, type: WarrantyType): Promise<WarrantyRecord> {
    return apiClient<WarrantyRecord>(`/api/warranty/generate/${deviceId}/${type}`, {
      method: "POST",
    });
  },
};

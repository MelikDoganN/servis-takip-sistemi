import { apiClient } from "./api";
import { Brand } from "@/types/brand";

export const brandService = {
  getAll(): Promise<Brand[]> {
    return apiClient<Brand[]>("/api/brands");
  },
};

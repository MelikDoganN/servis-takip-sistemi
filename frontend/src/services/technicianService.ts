import { apiClient } from "./api";
import {
  CreateTechnicianRequest,
  Technician,
  UpdateTechnicianRequest,
} from "@/types/technician";

export const technicianService = {
  getAll(): Promise<Technician[]> {
    return apiClient<Technician[]>("/api/technicians");
  },

  getById(id: number): Promise<Technician> {
    return apiClient<Technician>(`/api/technicians/${id}`);
  },

  create(data: CreateTechnicianRequest): Promise<Technician> {
    return apiClient<Technician>("/api/technicians", {
      method: "POST",
      body: data,
    });
  },

  update(id: number, data: UpdateTechnicianRequest): Promise<Technician> {
    return apiClient<Technician>(`/api/technicians/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  delete(id: number): Promise<void> {
    return apiClient<void>(`/api/technicians/${id}`, {
      method: "DELETE",
    });
  },

  /** Müsait ve iş yükü maxWorkload altında olan teknisyenler */
  getAvailable(maxWorkload = 5): Promise<Technician[]> {
    const params = new URLSearchParams({
      maxWorkload: String(maxWorkload),
    });
    return apiClient<Technician[]>(`/api/technicians/available?${params}`);
  },
};

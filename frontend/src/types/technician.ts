import { Region } from "./region";
import { User } from "./user";

export interface Technician {
  id: number;
  user: User;
  region: Region | null;
  whatsappNumber: string | null;
  currentWorkload: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/technicians — User + Technician birlikte oluşturulur */
export interface CreateTechnicianRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  whatsappNumber?: string;
  regionId?: number | null;
  currentWorkload?: number;
  isAvailable?: boolean;
}

/** PUT /api/technicians/{id} — mevcut entity alanları */
export interface UpdateTechnicianRequest {
  user?: { id: number };
  region?: { id: number } | null;
  whatsappNumber?: string;
  currentWorkload?: number;
  isAvailable?: boolean;
}

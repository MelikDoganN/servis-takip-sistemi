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

export interface CreateTechnicianRequest {
  user: { id: number };
  region?: { id: number } | null;
  whatsappNumber?: string;
  currentWorkload?: number;
  isAvailable?: boolean;
}

export interface UpdateTechnicianRequest {
  user: { id: number };
  region?: { id: number } | null;
  whatsappNumber?: string;
  currentWorkload?: number;
  isAvailable?: boolean;
}

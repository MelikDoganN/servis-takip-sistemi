import { Region } from "./region";
import { User } from "./user";

export interface Technician {
  id: number;
  user: User;
  region: Region;
  whatsappNumber: string;
  currentWorkload: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

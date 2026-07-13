import { Role } from "./role";

export interface User {
  id: number;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

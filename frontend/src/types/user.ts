import { BackendRoleName, Role } from "./role";

/** GET /api/users yanıt öğesi (passwordHash UI'da kullanılmaz) */
export interface User {
  id: number;
  role: Role;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/users body — backend Map<String,String> */
export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: Extract<BackendRoleName, "ADMIN" | "CENTER_OPERATOR">;
}

export interface CreateUserResponse {
  message: string;
  id: number;
}

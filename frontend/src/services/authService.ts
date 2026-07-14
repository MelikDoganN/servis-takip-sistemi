import { apiClient } from "./api";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/types/auth";

export const authService = {
  login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient<LoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
      skipAuth: true,
    });
  },

  register(data: RegisterRequest): Promise<RegisterResponse> {
    return apiClient<RegisterResponse>("/auth/register", {
      method: "POST",
      body: data,
      skipAuth: true,
    });
  },
};

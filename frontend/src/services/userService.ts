import { apiClient } from "./api";
import { PageResponse } from "@/types/api";
import {
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  User,
} from "@/types/user";

function unwrapContent<T>(data: PageResponse<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

export const userService = {
  getPage(
    page = 0,
    size = 10,
    search?: string
  ): Promise<PageResponse<User>> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (search?.trim()) params.set("search", search.trim());
    return apiClient<PageResponse<User>>(`/api/users?${params}`);
  },

  async getAll(size = 1000, search?: string): Promise<User[]> {
    const data = await this.getPage(0, size, search);
    return unwrapContent(data);
  },

  create(data: CreateUserRequest): Promise<CreateUserResponse> {
    return apiClient<CreateUserResponse>("/api/users", {
      method: "POST",
      body: data,
    });
  },

  /** Profil / aktiflik güncelleme — PUT /api/users/{id} */
  update(id: number, data: UpdateUserRequest): Promise<User> {
    const body: Record<string, string> = {};
    if (data.fullName !== undefined) body.fullName = data.fullName;
    if (data.email !== undefined) body.email = data.email;
    if (data.phone !== undefined) body.phone = data.phone ?? "";
    if (data.isActive !== undefined) body.isActive = String(data.isActive);
    return apiClient<User>(`/api/users/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: number): Promise<void> {
    return apiClient<void>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  updateRole(id: number, role: string): Promise<User> {
    return apiClient<User>(`/api/users/${id}/role`, {
      method: "PUT",
      body: { role },
    });
  },
};

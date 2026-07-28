import { apiClient } from "./api";
import { PageResponse } from "@/types/api";
import {
  CreateUserRequest,
  CreateUserResponse,
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

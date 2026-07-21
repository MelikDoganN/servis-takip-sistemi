import { apiClient } from "./api";
import {
  CreateUserRequest,
  CreateUserResponse,
  User,
} from "@/types/user";

export const userService = {
  getAll(): Promise<User[]> {
    return apiClient<User[]>("/api/users");
  },

  create(data: CreateUserRequest): Promise<CreateUserResponse> {
    return apiClient<CreateUserResponse>("/api/users", {
      method: "POST",
      body: data,
    });
  },
};

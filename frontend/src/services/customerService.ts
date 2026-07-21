import { apiClient } from "./api";
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "@/types/customer";
import { PageResponse } from "@/types/api";

function unwrapContent<T>(data: PageResponse<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

export const customerService = {
  getPage(page = 0, size = 10): Promise<PageResponse<Customer>> {
    return apiClient<PageResponse<Customer>>(
      `/api/customers?page=${page}&size=${size}`
    );
  },

  async getAll(size = 1000): Promise<Customer[]> {
    const data = await apiClient<PageResponse<Customer> | Customer[]>(
      `/api/customers?page=0&size=${size}`
    );
    return unwrapContent(data);
  },

  getById(id: number): Promise<Customer> {
    return apiClient<Customer>(`/api/customers/${id}`);
  },

  create(data: CreateCustomerRequest): Promise<Customer> {
    return apiClient<Customer>("/api/customers", {
      method: "POST",
      body: data,
    });
  },

  update(id: number, data: UpdateCustomerRequest): Promise<Customer> {
    return apiClient<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  delete(id: number): Promise<void> {
    return apiClient<void>(`/api/customers/${id}`, {
      method: "DELETE",
    });
  },
};

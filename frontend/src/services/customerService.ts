import { apiClient } from "./api";
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "@/types/customer";

export const customerService = {
  getAll(): Promise<Customer[]> {
    return apiClient<Customer[]>("/api/customers");
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

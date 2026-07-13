export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
}

export interface UpdateCustomerRequest {
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
}

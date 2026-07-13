export type RoleName =
  | "ROLE_ADMIN"
  | "ROLE_REGION_MANAGER"
  | "ROLE_CENTER_OPERATOR"
  | "ROLE_TECHNICIAN"
  | "ROLE_CUSTOMER";

export interface Role {
  id: number;
  name: RoleName;
  description: string;
  createdAt: string;
}

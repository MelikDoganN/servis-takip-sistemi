/**
 * Backend Role.name değerleri (DB'de ROLE_ prefix yok).
 * Spring Security authority = "ROLE_" + name (UserDetailsServiceImpl).
 */
export type BackendRoleName =
  | "ADMIN"
  | "CENTER_OPERATOR"
  | "TECHNICIAN"
  | "REGION_MANAGER"
  | "CUSTOMER";

/** Spring hasRole / JWT authority formatı */
export type RoleAuthority =
  | "ROLE_ADMIN"
  | "ROLE_REGION_MANAGER"
  | "ROLE_CENTER_OPERATOR"
  | "ROLE_TECHNICIAN"
  | "ROLE_CUSTOMER";

/** Nav / client tarafı (authority) */
export type RoleName = RoleAuthority;

export interface Role {
  id: number;
  name: BackendRoleName | string;
  description: string | null;
  createdAt: string;
}

/** Kullanıcı Yönetimi ekranında seçilebilir roller */
export const MANAGEABLE_ROLES: BackendRoleName[] = [
  "ADMIN",
  "CENTER_OPERATOR",
];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_OPERATOR: "Merkez Operatör",
  TECHNICIAN: "Teknisyen",
  REGION_MANAGER: "Bölge Yöneticisi",
  CUSTOMER: "Müşteri",
};

export function toAuthority(roleName: string): RoleAuthority | string {
  return roleName.startsWith("ROLE_") ? roleName : `ROLE_${roleName}`;
}

export function normalizeRoleName(roleName: string): string {
  return roleName.startsWith("ROLE_") ? roleName.slice(5) : roleName;
}

export function roleLabel(roleName?: string | null): string {
  if (!roleName) return "—";
  const key = normalizeRoleName(roleName);
  return ROLE_LABELS[key] ?? key;
}

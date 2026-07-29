const TOKEN_KEY = "servis_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/** JWT payload (doğrulama yok; UI yardımcı) */
export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  /** Spring authority listesi, örn. ["ROLE_ADMIN"] */
  roles?: string[];
  [key: string]: unknown;
}

/**
 * Backend JwtService: subject=email + roles claim (authority formatı).
 * Yetki kontrolü sunucuda yapılır; bu yardımcılar yalnızca UI içindir.
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const json = decodeURIComponent(
      Array.from(atob(padded), (c) =>
        `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`
      ).join("")
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenPayload(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  return parseJwtPayload(token);
}

export function getAuthEmail(): string | null {
  const payload = getTokenPayload();
  return typeof payload?.sub === "string" ? payload.sub : null;
}

/**
 * JWT `roles` claim → ["ROLE_ADMIN", ...].
 * Claim yoksa / geçersizse boş dizi (güvenli varsayılan).
 */
export function getAuthRoles(): string[] {
  const payload = getTokenPayload();
  const raw = payload?.roles;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => {
      const trimmed = r.trim();
      return trimmed.startsWith("ROLE_") ? trimmed : `ROLE_${trimmed}`;
    });
}

/** UI yardımcı — sunucu yetkisi değiştirmez. */
export function hasRole(...roles: string[]): boolean {
  const current = getAuthRoles();
  return roles.some((r) => {
    const auth = r.startsWith("ROLE_") ? r : `ROLE_${r}`;
    return current.includes(auth);
  });
}

export function isAdmin(): boolean {
  return hasRole("ROLE_ADMIN");
}

export function canManageRecords(): boolean {
  return hasRole("ROLE_ADMIN", "ROLE_CENTER_OPERATOR", "ROLE_REGION_MANAGER");
}

export function canDeleteRecords(): boolean {
  return hasRole("ROLE_ADMIN");
}

export function isTechnicianOnly(): boolean {
  const roles = getAuthRoles();
  return (
    roles.includes("ROLE_TECHNICIAN") &&
    !roles.includes("ROLE_ADMIN") &&
    !roles.includes("ROLE_CENTER_OPERATOR") &&
    !roles.includes("ROLE_REGION_MANAGER")
  );
}

export function isTokenExpired(): boolean {
  const payload = getTokenPayload();
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

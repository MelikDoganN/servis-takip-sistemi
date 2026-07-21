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
  [key: string]: unknown;
}

/**
 * Backend JwtService yalnızca subject=email koyuyor; rol claim yok.
 * Rol yetkisi sunucuda ROLE_{name} authority ile kontrol edilir.
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

export function isTokenExpired(): boolean {
  const payload = getTokenPayload();
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

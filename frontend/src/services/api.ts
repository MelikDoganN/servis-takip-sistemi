import { ApiError } from "@/types/api";
import { getToken, removeToken } from "@/lib/auth";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

function resolveMessage(
  status: number,
  bodyText: string,
  statusText: string,
  skipAuth: boolean
): string {
  if (status === 401 && !skipAuth) {
    return "Oturum doğrulaması gerekli. Lütfen giriş yapın.";
  }
  if (status === 403) {
    return "Bu işlem için yetkiniz bulunmuyor.";
  }

  if (!bodyText) {
    if (status === 401 && skipAuth) {
      return "Geçersiz e-posta veya şifre.";
    }
    return statusText || "İstek başarısız oldu";
  }

  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // düz metin hata gövdesi
  }

  if (status === 401 && skipAuth) {
    return "Geçersiz e-posta veya şifre.";
  }

  return bodyText.length > 300 ? bodyText.slice(0, 300) + "…" : bodyText;
}

function handleUnauthorized(): void {
  removeToken();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, skipAuth = false, ...rest } = options;

  const token = skipAuth ? null : getToken();
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const requestHeaders: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const response = await fetch(path, {
    ...rest,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  if (!response.ok) {
    let raw = "";
    try {
      raw = await response.text();
    } catch {
      raw = "";
    }

    if (response.status === 401 && !skipAuth) {
      handleUnauthorized();
    }

    const error: ApiError = {
      message: resolveMessage(response.status, raw, response.statusText, skipAuth),
      status: response.status,
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Binary/PDF indirme (JSON olmayan yanıtlar) */
export async function apiDownload(
  path: string,
  filenameFallback = "download"
): Promise<void> {
  const token = getToken();
  const response = await fetch(path, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let raw = "";
    try {
      raw = await response.text();
    } catch {
      raw = "";
    }
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error: ApiError = {
      message: resolveMessage(response.status, raw, response.statusText, false),
      status: response.status,
    };
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
  const filename = match?.[1]?.replace(/['"]/g, "") || filenameFallback;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

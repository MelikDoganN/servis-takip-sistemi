import { ApiError } from "@/types/api";
import { getToken } from "@/lib/auth";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;

  const token = getToken();
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const response = await fetch(path, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const errorBody = await response.text();
      if (errorBody) message = errorBody;
    } catch {
      message = response.statusText;
    }

    if (response.status === 401) {
      message = "Kimlik doğrulama gerekli. Backend AuthController henüz hazır değil.";
    }

    const error: ApiError = { message, status: response.status };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

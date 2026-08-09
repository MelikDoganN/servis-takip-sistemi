import type { PublicServiceStatus, PublicWarranty } from "@/types/publicLookup";

export class PublicLookupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicLookupError";
    this.status = status;
  }
}

function apiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
}

async function publicLookupFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${apiBase()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new PublicLookupError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.", 0);
  }

  if (!response.ok) {
    throw new PublicLookupError("İstek başarısız oldu", response.status);
  }

  return response.json() as Promise<T>;
}

export const publicLookupService = {
  getPublicWarranty(serialNumber: string, signal?: AbortSignal): Promise<PublicWarranty> {
    const encoded = encodeURIComponent(serialNumber.trim());
    return publicLookupFetch<PublicWarranty>(`/api/public/warranty/${encoded}`, signal);
  },

  getPublicServiceStatus(
    serviceNumber: string,
    phone: string,
    signal?: AbortSignal
  ): Promise<PublicServiceStatus> {
    const encoded = encodeURIComponent(serviceNumber.trim());
    const params = new URLSearchParams();
    params.set("phone", phone.trim());
    return publicLookupFetch<PublicServiceStatus>(
      `/api/public/service/${encoded}?${params.toString()}`,
      signal
    );
  },
};

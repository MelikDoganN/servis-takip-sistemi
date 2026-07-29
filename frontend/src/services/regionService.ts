import { apiClient } from "./api";
import { Region } from "@/types/region";
import { technicianService } from "./technicianService";

/** Bölge listesi — önce /api/regions, yoksa teknisyen kayıtlarından türetilir. */
export const regionService = {
  async getAll(): Promise<Region[]> {
    try {
      const data = await apiClient<Region[] | { content?: Region[] }>("/api/regions");
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.content)) return data.content;
    } catch {
      // Endpoint yoksa veya yetki hatası: teknisyen bölgelerinden düş
    }

    try {
      const techs = await technicianService.getAll();
      const map = new Map<number, Region>();
      for (const t of techs) {
        if (t.region?.id != null && !map.has(t.region.id)) {
          map.set(t.region.id, {
            id: t.region.id,
            name: t.region.name,
            description: t.region.description ?? "",
            createdAt: t.region.createdAt ?? "",
          });
        }
      }
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    } catch {
      return [];
    }
  },
};

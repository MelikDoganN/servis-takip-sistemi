"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  Users,
  MonitorSmartphone,
  ClipboardList,
  UserCog,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { customerService } from "@/services/customerService";
import { deviceService } from "@/services/deviceService";
import { workOrderService } from "@/services/workOrderService";
import { userService } from "@/services/userService";
import { technicianService } from "@/services/technicianService";
import { WORK_ORDER_STATUS_LABELS } from "@/types/workOrder";

type ResultCategory = "customer" | "device" | "workorder" | "user" | "technician";

interface SearchResult {
  id: string;
  category: ResultCategory;
  title: string;
  subtitle?: string;
  href: string;
}

const CATEGORY_META: Record<
  ResultCategory,
  { label: string; icon: React.ReactNode }
> = {
  customer: { label: "Müşteriler", icon: <Users className="h-3.5 w-3.5" /> },
  device: {
    label: "Cihazlar",
    icon: <MonitorSmartphone className="h-3.5 w-3.5" />,
  },
  workorder: {
    label: "İş Emirleri",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
  },
  technician: {
    label: "Teknisyenler",
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  user: { label: "Kullanıcılar", icon: <UserCog className="h-3.5 w-3.5" /> },
};

const MAX_PER_CATEGORY = 5;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const q = debounced.toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function run() {
      const items: SearchResult[] = [];

      const [customers, devices, workOrders, users, technicians] =
        await Promise.all([
          customerService.getAll(200).catch(() => []),
          deviceService.getAll(200).catch(() => []),
          workOrderService.getAll(200).catch(() => []),
          userService.getAll(200).catch(() => []),
          technicianService.getAll().catch(() => []),
        ]);

      customers
        .filter(
          (c) =>
            c.fullName?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY)
        .forEach((c) =>
          items.push({
            id: `customer-${c.id}`,
            category: "customer",
            title: c.fullName,
            subtitle: c.phone || c.email || undefined,
            href: `/musteriler?q=${encodeURIComponent(c.fullName)}`,
          })
        );

      devices
        .filter(
          (d) =>
            d.serialNumber?.toLowerCase().includes(q) ||
            d.customer?.fullName?.toLowerCase().includes(q) ||
            d.model?.name?.toLowerCase().includes(q) ||
            d.model?.brand?.name?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY)
        .forEach((d) =>
          items.push({
            id: `device-${d.id}`,
            category: "device",
            title: d.serialNumber,
            subtitle:
              [d.model?.brand?.name, d.model?.name].filter(Boolean).join(" ") ||
              d.customer?.fullName ||
              undefined,
            href: `/cihazlar?q=${encodeURIComponent(d.serialNumber)}`,
          })
        );

      workOrders
        .filter(
          (wo) =>
            wo.description?.toLowerCase().includes(q) ||
            wo.customer?.fullName?.toLowerCase().includes(q) ||
            wo.device?.serialNumber?.toLowerCase().includes(q) ||
            wo.technician?.user?.fullName?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY)
        .forEach((wo) =>
          items.push({
            id: `workorder-${wo.id}`,
            category: "workorder",
            title: wo.customer?.fullName || "İş emri",
            subtitle: `${WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status}${
              wo.device?.serialNumber ? ` · ${wo.device.serialNumber}` : ""
            }`,
            href: `/is-emirleri?q=${encodeURIComponent(wo.customer?.fullName || wo.device?.serialNumber || "")}`,
          })
        );

      technicians
        .filter(
          (t) =>
            t.user?.fullName?.toLowerCase().includes(q) ||
            t.user?.email?.toLowerCase().includes(q) ||
            t.whatsappNumber?.toLowerCase().includes(q) ||
            t.region?.name?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY)
        .forEach((t) =>
          items.push({
            id: `technician-${t.id}`,
            category: "technician",
            title: t.user?.fullName || "Teknisyen",
            subtitle: t.region?.name || t.user?.email || undefined,
            href: `/teknisyenler?q=${encodeURIComponent(t.user?.fullName || "")}`,
          })
        );

      users
        .filter(
          (u) =>
            u.fullName?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY)
        .forEach((u) =>
          items.push({
            id: `user-${u.id}`,
            category: "user",
            title: u.fullName,
            subtitle: u.email,
            href: `/kullanici-yonetimi?q=${encodeURIComponent(u.fullName)}`,
          })
        );

      if (!cancelled) {
        setResults(items);
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const map = new Map<ResultCategory, SearchResult[]>();
    for (const item of results) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [results]);

  const showDropdown = open && debounced.length >= 2;

  const handleSelect = (item: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Müşteri, cihaz, iş emri, teknisyen, kullanıcı ara..."
        className="h-10 w-56 rounded-xl border border-slate-200 bg-surface pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20 lg:w-72"
        aria-label="Genel arama"
      />

      {showDropdown && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated animate-fade-in">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aranıyor…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">
              &ldquo;{debounced}&rdquo; için sonuç bulunamadı
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto py-2">
              {(Object.keys(CATEGORY_META) as ResultCategory[]).map(
                (category) => {
                  const items = grouped.get(category);
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={category} className="px-2 py-1.5">
                      <p className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {CATEGORY_META[category].icon}
                        {CATEGORY_META[category].label}
                      </p>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition",
                            "hover:bg-accent-soft"
                          )}
                        >
                          <span className="truncate text-sm font-medium text-slate-800">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="truncate text-xs text-slate-500">
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

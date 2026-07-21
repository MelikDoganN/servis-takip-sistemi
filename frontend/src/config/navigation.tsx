import { RoleName } from "@/types/role";
import {
  LayoutDashboard,
  Users,
  MonitorSmartphone,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  UserCog,
  Wrench,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  roles: RoleName[];
  icon: React.ReactNode;
  description?: string;
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Operasyonel özet",
    roles: ["ROLE_ADMIN", "ROLE_REGION_MANAGER", "ROLE_CENTER_OPERATOR"],
    icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Müşteriler",
    href: "/musteriler",
    description: "Müşteri portföyü",
    roles: ["ROLE_ADMIN", "ROLE_CENTER_OPERATOR"],
    icon: <Users className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Cihazlar",
    href: "/cihazlar",
    description: "Cihaz envanteri",
    roles: ["ROLE_ADMIN", "ROLE_CENTER_OPERATOR"],
    icon: <MonitorSmartphone className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "İş Emirleri",
    href: "/is-emirleri",
    description: "Servis talepleri",
    roles: ["ROLE_ADMIN", "ROLE_REGION_MANAGER", "ROLE_CENTER_OPERATOR", "ROLE_TECHNICIAN"],
    icon: <ClipboardList className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Teknisyenler",
    href: "/teknisyenler",
    description: "Saha teknisyenleri",
    roles: ["ROLE_ADMIN", "ROLE_REGION_MANAGER", "ROLE_CENTER_OPERATOR"],
    icon: <Wrench className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Garanti Sorgulama",
    href: "/garanti-sorgulama",
    description: "Garanti kontrolü",
    roles: ["ROLE_ADMIN", "ROLE_CENTER_OPERATOR"],
    icon: <ShieldCheck className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Raporlar",
    href: "/raporlar",
    description: "Performans analizi",
    roles: ["ROLE_ADMIN", "ROLE_REGION_MANAGER"],
    icon: <BarChart3 className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    label: "Kullanıcı Yönetimi",
    href: "/kullanici-yonetimi",
    description: "Kullanıcı kayıtları",
    roles: ["ROLE_ADMIN"],
    icon: <UserCog className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
  },
];

"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BarChart3 } from "lucide-react";

export default function RaporlarPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Raporlar"
        description="Operasyonel performans ve servis analizleri"
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled title="Henüz desteklenmiyor">
              PDF
            </Button>
            <Button variant="outline" size="sm" disabled title="Henüz desteklenmiyor">
              Excel
            </Button>
          </div>
        }
      />

      <SectionCard title="Rapor Paneli">
        <EmptyState
          title="Modül henüz aktif değil"
          description="Bu modül backend API'si tamamlandığında aktif olacaktır"
        />
      </SectionCard>
    </div>
  );
}

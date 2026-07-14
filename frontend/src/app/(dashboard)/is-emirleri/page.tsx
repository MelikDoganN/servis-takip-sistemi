"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ClipboardList } from "lucide-react";

export default function IsEmirleriPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="İş Emirleri"
        description="Servis taleplerini takip edin ve yönetin"
        icon={<ClipboardList className="h-5 w-5" />}
        action={
          <Button disabled title="Henüz desteklenmiyor">
            Yeni İş Emri
          </Button>
        }
      />

      <SectionCard title="İş Emri Listesi">
        <EmptyState
          title="Modül henüz aktif değil"
          description="Bu modül backend API'si tamamlandığında aktif olacaktır"
        />
      </SectionCard>
    </div>
  );
}

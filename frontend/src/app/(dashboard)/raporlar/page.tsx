import { PageHeader } from "@/components/layout/PageHeader";
import { PendingIntegration } from "@/components/ui/PendingIntegration";

export default function RaporlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="KPI ve performans raporları"
      />

      <PendingIntegration
        title="Rapor Entegrasyonu Bekleniyor"
        description="Backend'de rapor endpoint'i henüz mevcut değil. Kişi 1 rapor API'lerini ekledikten sonra bu sayfa bağlanacak."
      />
    </div>
  );
}

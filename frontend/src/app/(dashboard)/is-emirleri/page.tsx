import { PageHeader } from "@/components/layout/PageHeader";
import { PendingIntegration } from "@/components/ui/PendingIntegration";

export default function IsEmirleriPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="İş Emirleri"
        description="Arıza taleplerini takip edin"
      />

      <PendingIntegration
        title="İş Emri Entegrasyonu Bekleniyor"
        description="Backend'de WorkOrder controller henüz mevcut değil. Kişi 1 iş emri API'lerini ekledikten sonra bu sayfa bağlanacak."
      />
    </div>
  );
}

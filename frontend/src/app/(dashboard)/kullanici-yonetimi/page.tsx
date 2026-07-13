import { PageHeader } from "@/components/layout/PageHeader";
import { PendingIntegration } from "@/components/ui/PendingIntegration";

export default function KullaniciYonetimiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Kullanıcı ve rol yönetimi"
      />

      <PendingIntegration
        title="Kullanıcı Yönetimi Entegrasyonu Bekleniyor"
        description="Backend'de kullanıcı yönetimi endpoint'i henüz mevcut değil. Kişi 1 User API'lerini ekledikten sonra bu sayfa bağlanacak."
      />
    </div>
  );
}

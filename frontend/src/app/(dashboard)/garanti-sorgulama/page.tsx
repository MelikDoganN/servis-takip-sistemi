import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function GarantiSorgulamaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Garanti Sorgulama</h2>
        <p className="mt-1 text-sm text-gray-500">
          Seri numarası ile garanti durumunu sorgulayın
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sorgulama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Seri Numarası" placeholder="Cihaz seri numarasını girin" />
            </div>
            <Button className="sm:mb-0">Sorgula</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Garanti Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Sorgulama yapmak için seri numarası girin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

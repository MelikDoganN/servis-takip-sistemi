import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export default function MusterilerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Müşteriler</h2>
          <p className="mt-1 text-sm text-gray-500">Müşteri kayıtlarını yönetin</p>
        </div>
        <Button>Yeni Müşteri</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Listesi</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  Henüz müşteri kaydı bulunmuyor
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

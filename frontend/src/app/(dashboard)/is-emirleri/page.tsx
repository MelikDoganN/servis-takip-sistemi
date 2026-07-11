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

const statusColumns = [
  { label: "Açıldı", color: "bg-gray-100 text-gray-700" },
  { label: "Atandı", color: "bg-blue-100 text-blue-700" },
  { label: "Parça Bekliyor", color: "bg-orange-100 text-orange-700" },
  { label: "Çözüldü", color: "bg-green-100 text-green-700" },
  { label: "Kapatıldı", color: "bg-slate-100 text-slate-700" },
];

export default function IsEmirleriPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">İş Emirleri</h2>
          <p className="mt-1 text-sm text-gray-500">Arıza taleplerini takip edin</p>
        </div>
        <Button>Yeni İş Emri</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {statusColumns.map((col) => (
          <Card key={col.label}>
            <CardHeader className="py-3">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${col.color}`}>
                {col.label}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-gray-400">Kayıt yok</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İş Emri Listesi</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İş Emri No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Cihaz</TableHead>
                <TableHead>Teknisyen</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  Henüz iş emri bulunmuyor
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

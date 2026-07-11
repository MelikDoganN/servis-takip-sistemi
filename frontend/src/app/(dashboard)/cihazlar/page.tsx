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

export default function CihazlarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cihazlar</h2>
          <p className="mt-1 text-sm text-gray-500">Cihaz kayıtlarını yönetin</p>
        </div>
        <Button>Yeni Cihaz</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cihaz Listesi</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seri No</TableHead>
                <TableHead>Marka / Model</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Satın Alma</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  Henüz cihaz kaydı bulunmuyor
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

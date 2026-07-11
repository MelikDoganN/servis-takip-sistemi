import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const reportCards = [
  {
    title: "Aylık İş Emri Raporu",
    description: "Dönemsel iş emri istatistikleri",
  },
  {
    title: "Teknisyen Performansı",
    description: "Teknisyen bazlı çözüm süreleri",
  },
  {
    title: "Garanti Durumu",
    description: "Aktif ve süresi dolan garantiler",
  },
  {
    title: "Bölge Bazlı Rapor",
    description: "Bölge kırılımında iş dağılımı",
  },
];

export default function RaporlarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Raporlar</h2>
        <p className="mt-1 text-sm text-gray-500">KPI ve performans raporları</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reportCards.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{report.description}</p>
              <p className="mt-4 text-sm text-gray-400">Veri henüz mevcut değil</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

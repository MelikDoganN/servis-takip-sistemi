import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { WorkOrderSummaryReport } from "@/services/reportService";

/**
 * jsPDF standart fontları Türkçe özel karakterleri (ş, ğ, ı, ö, ü, ç) doğru
 * render edemediği için PDF çıktısında okunabilirlik amacıyla ASCII karşılıklarına
 * çeviriyoruz. Ekran/UI tarafında Türkçe karakterler olduğu gibi kalır.
 */
const TURKISH_ASCII_MAP: Record<string, string> = {
  ş: "s",
  Ş: "S",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ü: "u",
  Ü: "U",
  ç: "c",
  Ç: "C",
};

function t(text: string | null | undefined): string {
  if (!text) return "-";
  return text.replace(/[şŞğĞıİöÖüÜçÇ]/g, (ch) => TURKISH_ASCII_MAP[ch] ?? ch);
}

export interface WorkOrderDetailRow {
  id: number;
  customer: string;
  device: string;
  technician: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface TechnicianPerformanceRow {
  name: string;
  total: number;
  open: number;
  resolved: number;
  completionRate: number;
}

export interface StatusBreakdownItem {
  label: string;
  value: number;
}

interface GenerateReportPdfParams {
  report: WorkOrderSummaryReport;
  startDate?: string;
  endDate?: string;
  statusBreakdown: StatusBreakdownItem[];
  workOrders: WorkOrderDetailRow[];
  technicianPerformance: TechnicianPerformanceRow[];
}

function addSectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(12);
  doc.setTextColor(15, 42, 89);
  doc.text(t(text), 14, y);
  return y + 6;
}

function getFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

export function generateWorkOrderReportPdf({
  report,
  startDate,
  endDate,
  statusBreakdown,
  workOrders,
  technicianPerformance,
}: GenerateReportPdfParams): void {
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString("tr-TR");
  const rangeText = `${startDate || "Baslangic"} - ${endDate || "Bugun"}`;

  doc.setFontSize(16);
  doc.setTextColor(15, 42, 89);
  doc.text(t("Servis Takip Sistemi"), 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(t("Is Emri Ozet Raporu"), 14, 26);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(t(`Tarih araligi: ${rangeText}`), 14, 34);
  doc.text(t(`Olusturulma: ${generatedAt}`), 14, 40);

  // Özet tablo
  const summaryRows: [string, string][] = [
    ["Toplam", String(report.total ?? 0)],
    ["Acik", String(report.open ?? 0)],
    ["Atandi", String(report.assigned ?? 0)],
    ["Parca Bekliyor", String(report.waitingParts ?? 0)],
    ["Cozuldu", String(report.resolved ?? 0)],
    ["Kapali", String(report.closed ?? 0)],
  ];

  autoTable(doc, {
    startY: 48,
    head: [[t("Durum"), t("Adet")]],
    body: summaryRows.map(([label, value]) => [t(label), value]),
    theme: "striped",
    headStyles: { fillColor: [15, 42, 89], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  const total = report.total ?? 0;
  const closed = report.closed ?? 0;
  const openTotal =
    (report.open ?? 0) + (report.assigned ?? 0) + (report.waitingParts ?? 0);
  const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  let y = getFinalY(doc, 60);
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(t("Ozet"), 14, y + 10);
  doc.setFontSize(10);
  doc.setTextColor(80);
  [
    `Toplam is emri: ${total}`,
    `Devam eden is emri: ${openTotal}`,
    `Tamamlanma orani: %${closeRate}`,
  ].forEach((line, i) => {
    doc.text(t(line), 14, y + 18 + i * 6);
  });

  // Durum dağılımı (grafik yerine sayısal tablo)
  y = y + 18 + 3 * 6 + 6;
  addSectionTitle(doc, "Durum Dagilimi", y);
  autoTable(doc, {
    startY: y + 4,
    head: [[t("Durum"), t("Adet"), t("Oran")]],
    body: statusBreakdown.map((item) => [
      t(item.label),
      String(item.value),
      `%${total > 0 ? Math.round((item.value / total) * 100) : 0}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [18, 167, 205], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Teknisyen performans tablosu
  y = getFinalY(doc, y + 30) + 12;
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }
  y = addSectionTitle(doc, "Teknisyen Performansi", y);
  autoTable(doc, {
    startY: y,
    head: [[t("Teknisyen"), t("Toplam"), t("Acik"), t("Cozulen"), t("Basari %")]],
    body:
      technicianPerformance.length > 0
        ? technicianPerformance.map((row) => [
            t(row.name),
            String(row.total),
            String(row.open),
            String(row.resolved),
            `%${row.completionRate}`,
          ])
        : [[t("Veri bulunamadi"), "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: { fillColor: [15, 42, 89], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // İş emri detay tablosu (yeni sayfadan başlat)
  doc.addPage();
  const detailY = addSectionTitle(doc, "Is Emri Detay Raporu", 18);
  autoTable(doc, {
    startY: detailY + 2,
    head: [
      [
        t("ID"),
        t("Musteri"),
        t("Cihaz"),
        t("Teknisyen"),
        t("Durum"),
        t("Oncelik"),
        t("Olusturma"),
      ],
    ],
    body:
      workOrders.length > 0
        ? workOrders.map((wo) => [
            `#${wo.id}`,
            t(wo.customer),
            t(wo.device),
            t(wo.technician),
            t(wo.status),
            t(wo.priority),
            wo.createdAt,
          ])
        : [[t("Veri bulunamadi"), "-", "-", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [15, 42, 89], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 10, right: 10 },
    columnStyles: { 1: { cellWidth: 32 }, 2: { cellWidth: 30 } },
  });

  const filenameRange = `${startDate || "tumzaman"}_${endDate || "guncel"}`;
  doc.save(`is-emri-raporu_${filenameRange}.pdf`);
}

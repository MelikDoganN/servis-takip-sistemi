import jsPDF from "jspdf";
import { WorkOrderSummaryReport } from "@/services/reportService";
import {
  applyFooters,
  drawKpiCards,
  drawReportHeader,
  drawSectionTitle,
  formatReportFilename,
  getAutoTableFinalY,
  pdfText,
  runAutoTable,
  savePdf,
  successRateLabel,
  availabilityLabel,
  todayIsoDate,
} from "@/lib/pdfTheme";

export interface WorkOrderDetailRow {
  customer: string;
  device: string;
  technician: string;
  status: string;
  priority: string;
  createdAt: string;
  serviceNumber?: string;
}

export interface TechnicianPerformanceRow {
  name: string;
  region?: string;
  total: number;
  open: number;
  resolved: number;
  completionRate: number;
  currentWorkload?: number;
  isAvailable?: boolean;
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

export interface TechnicianPerformancePdfParams {
  rows: TechnicianPerformanceRow[];
  startDate?: string;
  endDate?: string;
}

export interface NotificationReportRow {
  title: string;
  type: string;
  channel: string;
  status: string;
  createdAt: string;
}

export interface WarrantyReportRow {
  serial: string;
  brandModel: string;
  customer: string;
  status: string;
  startDate: string;
  endDate: string;
}

/** İş emri özet + detay + teknisyen özeti (kurumsal) */
export function generateWorkOrderReportPdf({
  report,
  startDate,
  endDate,
  statusBreakdown,
  workOrders,
  technicianPerformance,
}: GenerateReportPdfParams): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const total = report.total ?? 0;
  const openCount =
    (report.open ?? 0) + (report.assigned ?? 0) + (report.waitingParts ?? 0);
  const resolved = report.resolved ?? 0;
  const closed = report.closed ?? 0;
  const successAvg =
    total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0;

  let y = drawReportHeader(doc, {
    title: "Is Emri Ozet Raporu",
    startDate,
    endDate,
  });

  y = drawKpiCards(doc, [
    { label: "Toplam Is", value: total, tone: "navy" },
    { label: "Acik / Devam", value: openCount, tone: "warning" },
    { label: "Cozulen", value: resolved, tone: "success" },
    { label: "Kapali", value: closed, tone: "muted" },
    { label: "Tamamlanma %", value: `%${successAvg}`, tone: "accent" },
  ], y);

  y = drawSectionTitle(doc, "Durum Ozeti", y);
  runAutoTable(doc, {
    startY: y,
    head: [[pdfText("Durum"), pdfText("Adet")]],
    body: [
      [pdfText("Toplam"), String(report.total ?? 0)],
      [pdfText("Acik"), String(report.open ?? 0)],
      [pdfText("Atandi"), String(report.assigned ?? 0)],
      [pdfText("Parca Bekliyor"), String(report.waitingParts ?? 0)],
      [pdfText("Cozuldu"), String(report.resolved ?? 0)],
      [pdfText("Kapali"), String(report.closed ?? 0)],
    ],
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: "right" },
    },
  });

  y = getAutoTableFinalY(doc, y) + 10;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  y = drawSectionTitle(doc, "Durum Dagilimi", y);
  runAutoTable(doc, {
    startY: y,
    head: [[pdfText("Durum"), pdfText("Adet"), pdfText("Oran")]],
    body:
      statusBreakdown.length > 0
        ? statusBreakdown.map((item) => [
            pdfText(item.label),
            String(item.value),
            `%${total > 0 ? Math.round((item.value / total) * 100) : 0}`,
          ])
        : [[pdfText("Veri yok"), "-", "-"]],
    columnStyles: {
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 28 },
    },
  });

  y = getAutoTableFinalY(doc, y) + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y = drawSectionTitle(doc, "Teknisyen Performans Ozeti", y);
  runAutoTable(doc, {
    startY: y,
    head: [
      [
        pdfText("Teknisyen"),
        pdfText("Toplam"),
        pdfText("Acik"),
        pdfText("Cozulen"),
        pdfText("Basari"),
      ],
    ],
    body:
      technicianPerformance.length > 0
        ? technicianPerformance.map((row) => [
            pdfText(row.name),
            String(row.total),
            String(row.open),
            String(row.resolved),
            pdfText(successRateLabel(row.completionRate)),
          ])
        : [[pdfText("Veri bulunamadi"), "-", "-", "-", "-"]],
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 24 },
      4: { cellWidth: 36 },
    },
  });

  doc.addPage();
  y = drawSectionTitle(doc, "Is Emri Detay Listesi", 20);
  runAutoTable(doc, {
    startY: y,
    head: [
      [
        pdfText("Servis No"),
        pdfText("Musteri"),
        pdfText("Cihaz"),
        pdfText("Teknisyen"),
        pdfText("Durum"),
        pdfText("Oncelik"),
        pdfText("Olusturma"),
      ],
    ],
    body:
      workOrders.length > 0
        ? workOrders.map((wo) => [
            pdfText(wo.serviceNumber || "-"),
            pdfText(wo.customer),
            pdfText(wo.device),
            pdfText(wo.technician),
            pdfText(wo.status),
            pdfText(wo.priority),
            pdfText(wo.createdAt),
          ])
        : [[pdfText("Veri bulunamadi"), "-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 32 },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 18 },
      6: { cellWidth: 28 },
    },
  });

  savePdf(
    doc,
    formatReportFilename("Is-Emri-Raporu", endDate || startDate || todayIsoDate())
  );
}

/** Teknisyen performans raporu (ayrı PDF) */
export function generateTechnicianPerformancePdf({
  rows,
  startDate,
  endDate,
}: TechnicianPerformancePdfParams): void {
  if (!rows) {
    throw new Error("Teknisyen performans verisi yok");
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const techCount = rows.length;
  const totalJobs = rows.reduce((s, r) => s + (r.total || 0), 0);
  const totalResolved = rows.reduce((s, r) => s + (r.resolved || 0), 0);
  const totalOpen = rows.reduce((s, r) => s + (r.open || 0), 0);
  const avgSuccess =
    techCount > 0
      ? Math.round(
          rows.reduce((s, r) => s + (r.completionRate || 0), 0) / techCount
        )
      : 0;

  let y = drawReportHeader(doc, {
    title: "Teknisyen Performans Raporu",
    startDate,
    endDate,
  });

  y = drawKpiCards(doc, [
    { label: "Toplam Teknisyen", value: techCount, tone: "navy" },
    { label: "Toplam Is", value: totalJobs, tone: "accent" },
    { label: "Cozulen", value: totalResolved, tone: "success" },
    { label: "Acik", value: totalOpen, tone: "warning" },
    { label: "Basari Ort.", value: `%${avgSuccess}`, tone: "muted" },
  ], y);

  y = drawSectionTitle(doc, "Teknisyen Performans Tablosu", y);
  runAutoTable(doc, {
    startY: y,
    head: [
      [
        pdfText("Teknisyen"),
        pdfText("Bolge"),
        pdfText("Toplam"),
        pdfText("Acik"),
        pdfText("Cozulen"),
        pdfText("Basari %"),
            pdfText("Is Yuku"),
            pdfText("Durum"),
          ],
        ],
        body:
          rows.length > 0
            ? rows.map((row) => [
                pdfText(row.name),
                pdfText(row.region || "-"),
                String(row.total ?? 0),
                String(row.open ?? 0),
                String(row.resolved ?? 0),
                pdfText(successRateLabel(row.completionRate ?? 0)),
                String(row.currentWorkload ?? 0),
                pdfText(
                  availabilityLabel(
                    row.isAvailable ?? true,
                    row.currentWorkload ?? 0
                  )
                ),
              ])
            : [
                [
                  pdfText("Veri bulunamadi"),
                  "-",
                  "-",
                  "-",
                  "-",
                  "-",
                  "-",
                  "-",
                ],
              ],
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 24 },
          2: { halign: "right", cellWidth: 16 },
          3: { halign: "right", cellWidth: 14 },
          4: { halign: "right", cellWidth: 18 },
          5: { cellWidth: 28 },
          6: { halign: "right", cellWidth: 16 },
          7: { cellWidth: 20 },
        },
      });

      // Başarı eşiği açıklaması
      const afterY = getAutoTableFinalY(doc, y) + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        pdfText(
          "Basari gostergesi: ● Yuksek >=%80  |  ● Orta %50-79  |  ● Dusuk <%50"
        ),
        14,
        afterY
      );
      doc.text(
        pdfText("Durum: Musait / Mesgul / Pasif"),
        14,
        afterY + 4
      );

  savePdf(
    doc,
    formatReportFilename(
      "Teknisyen-Performansi",
      endDate || startDate || todayIsoDate()
    )
  );
}

/** Bildirim raporu (ortak tema) */
export function generateNotificationReportPdf(
  rows: NotificationReportRow[],
  startDate?: string,
  endDate?: string
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawReportHeader(doc, {
    title: "Bildirim Raporu",
    startDate,
    endDate,
  });

  y = drawKpiCards(doc, [
    { label: "Toplam", value: rows.length, tone: "navy" },
    {
      label: "Gonderilen",
      value: rows.filter((r) => r.status.toLowerCase().includes("sent") || r.status.includes("Gonder")).length,
      tone: "success",
    },
    {
      label: "Basarisiz",
      value: rows.filter((r) => r.status.toLowerCase().includes("fail") || r.status.includes("Basarisiz")).length,
      tone: "danger",
    },
  ], y);

  y = drawSectionTitle(doc, "Bildirim Listesi", y);
  runAutoTable(doc, {
    startY: y,
    head: [
      [
        pdfText("Baslik"),
        pdfText("Tur"),
        pdfText("Kanal"),
        pdfText("Durum"),
        pdfText("Tarih"),
      ],
    ],
    body:
      rows.length > 0
        ? rows.map((r) => [
            pdfText(r.title),
            pdfText(r.type),
            pdfText(r.channel),
            pdfText(r.status),
            pdfText(r.createdAt),
          ])
        : [[pdfText("Veri bulunamadi"), "-", "-", "-", "-"]],
  });

  savePdf(
    doc,
    formatReportFilename("Bildirim-Raporu", endDate || startDate || todayIsoDate())
  );
}

/** Garanti raporu (ortak tema) */
export function generateWarrantyReportPdf(
  rows: WarrantyReportRow[],
  startDate?: string,
  endDate?: string
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawReportHeader(doc, {
    title: "Garanti Raporu",
    startDate,
    endDate,
  });

  y = drawKpiCards(doc, [
    { label: "Toplam Kayit", value: rows.length, tone: "navy" },
    {
      label: "Aktif",
      value: rows.filter((r) =>
        /aktif|devam|active/i.test(r.status)
      ).length,
      tone: "success",
    },
    {
      label: "Suresi Dolmus",
      value: rows.filter((r) =>
        /dolmus|expired|bit/i.test(r.status)
      ).length,
      tone: "danger",
    },
  ], y);

  y = drawSectionTitle(doc, "Garanti Listesi", y);
  runAutoTable(doc, {
    startY: y,
    head: [
      [
        pdfText("Seri No"),
        pdfText("Cihaz"),
        pdfText("Musteri"),
        pdfText("Durum"),
        pdfText("Baslangic"),
        pdfText("Bitis"),
      ],
    ],
    body:
      rows.length > 0
        ? rows.map((r) => [
            pdfText(r.serial),
            pdfText(r.brandModel),
            pdfText(r.customer),
            pdfText(r.status),
            pdfText(r.startDate),
            pdfText(r.endDate),
          ])
        : [[pdfText("Veri bulunamadi"), "-", "-", "-", "-", "-"]],
  });

  savePdf(
    doc,
    formatReportFilename("Garanti-Raporu", endDate || startDate || todayIsoDate())
  );
}

/* ——— Tek iş emri detay PDF (modal) ——— */

export interface SingleWorkOrderPdfData {
  workOrderNo?: string;
  companyTitle?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deviceSerial: string;
  deviceBrandModel?: string;
  technicianName: string;
  technicianPhone?: string;
  description: string;
  status: string;
  priority: string;
  serviceType?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  closedAt?: string;
  deliveredAt?: string;
  resolutionNote?: string;
  deliveryNote?: string;
  cancellationReason?: string;
  historyLines?: string[];
  attachmentNames?: string[];
}

function buildSingleWorkOrderDoc(data: SingleWorkOrderPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawReportHeader(doc, {
    title: data.workOrderNo
      ? `Servis Kaydi ${data.workOrderNo}`
      : "Is Emri Detay Raporu",
  });

  y = drawSectionTitle(doc, "Kayit Bilgileri", y);
  runAutoTable(doc, {
    startY: y,
    head: [[pdfText("Alan"), pdfText("Deger")]],
    body: [
      [pdfText("Servis No"), pdfText(data.workOrderNo)],
      [pdfText("Musteri"), pdfText(data.customerName)],
      [pdfText("Musteri Telefon"), pdfText(data.customerPhone)],
      [pdfText("Musteri E-posta"), pdfText(data.customerEmail)],
      [pdfText("Cihaz Seri No"), pdfText(data.deviceSerial)],
      [pdfText("Marka / Model"), pdfText(data.deviceBrandModel)],
      [pdfText("Teknisyen"), pdfText(data.technicianName)],
      [pdfText("Teknisyen Iletisim"), pdfText(data.technicianPhone)],
      [pdfText("Durum"), pdfText(data.status)],
      [pdfText("Oncelik"), pdfText(data.priority)],
      [pdfText("Servis Tipi"), pdfText(data.serviceType)],
      [pdfText("Aciklama"), pdfText(data.description)],
      [pdfText("Cozum Notu"), pdfText(data.resolutionNote)],
      [pdfText("Teslim Notu"), pdfText(data.deliveryNote)],
      [pdfText("Iptal Nedeni"), pdfText(data.cancellationReason)],
      [pdfText("Olusturma"), pdfText(data.createdAt)],
      [pdfText("Atama"), pdfText(data.assignedAt)],
      [pdfText("Tamamlanma"), pdfText(data.completedAt)],
      [pdfText("Teslim Tarihi"), pdfText(data.deliveredAt)],
      [pdfText("Kapanis"), pdfText(data.closedAt)],
    ],
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" } },
  });

  y = getAutoTableFinalY(doc, y) + 8;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y = drawSectionTitle(doc, "Zaman Cizelgesi", y);
  runAutoTable(doc, {
    startY: y,
    head: [[pdfText("Olay")]],
    body:
      data.historyLines && data.historyLines.length > 0
        ? data.historyLines.map((line) => [pdfText(line)])
        : [[pdfText("Kayit bulunamadi")]],
  });

  y = getAutoTableFinalY(doc, y) + 8;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y = drawSectionTitle(doc, "Ekler", y);
  runAutoTable(doc, {
    startY: y,
    head: [[pdfText("Dosya")]],
    body:
      data.attachmentNames && data.attachmentNames.length > 0
        ? data.attachmentNames.map((name) => [pdfText(name)])
        : [[pdfText("Kayit bulunamadi")]],
  });

  return doc;
}

export function createWorkOrderDetailPdfBlobUrl(
  data: SingleWorkOrderPdfData
): string {
  const doc = buildSingleWorkOrderDoc(data);
  applyFooters(doc);
  return URL.createObjectURL(doc.output("blob"));
}

export function downloadWorkOrderDetailPdf(
  data: SingleWorkOrderPdfData,
  filename?: string
): void {
  const doc = buildSingleWorkOrderDoc(data);
  const name =
    filename ||
    formatReportFilename(
      `Servis-${data.workOrderNo || "detay"}`.replace(/\s+/g, "-")
    );
  savePdf(doc, name);
}

import jsPDF from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

/** Kurumsal PDF renk paleti (RGB) */
export const PDF_COLORS = {
  navy: [15, 42, 89] as [number, number, number],
  navySoft: [30, 58, 110] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  grayLight: [241, 245, 249] as [number, number, number],
  grayBorder: [203, 213, 225] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [202, 138, 4] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  accent: [18, 167, 205] as [number, number, number],
};

/**
 * jsPDF helvetica Türkçe glifleri desteklemez.
 * PDF okunabilirliği için ASCII karşılıklarına çeviriyoruz.
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

export function pdfText(text: string | null | undefined): string {
  if (text == null || text === "") return "-";
  return String(text).replace(
    /[şŞğĞıİöÖüÜçÇ]/g,
    (ch) => TURKISH_ASCII_MAP[ch] ?? ch
  );
}

export function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatReportFilename(base: string, date = todayIsoDate()): string {
  const safe = base
    .replace(/[şŞ]/g, (c) => (c === "ş" ? "s" : "S"))
    .replace(/[ğĞ]/g, (c) => (c === "ğ" ? "g" : "G"))
    .replace(/[ıİ]/g, (c) => (c === "ı" ? "i" : "I"))
    .replace(/[öÖ]/g, (c) => (c === "ö" ? "o" : "O"))
    .replace(/[üÜ]/g, (c) => (c === "ü" ? "u" : "U"))
    .replace(/[çÇ]/g, (c) => (c === "ç" ? "c" : "C"))
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  return `${safe}-${date}.pdf`;
}

export function getAutoTableFinalY(doc: jsPDF, fallback: number): number {
  return (
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

export interface PdfReportMeta {
  title: string;
  reportNo?: string;
  startDate?: string;
  endDate?: string;
  generatedAt?: string;
}

export interface PdfKpiCard {
  label: string;
  value: string | number;
  /** navy | accent | success | warning | danger | muted */
  tone?: "navy" | "accent" | "success" | "warning" | "danger" | "muted";
}

function toneColor(
  tone: PdfKpiCard["tone"]
): [number, number, number] {
  switch (tone) {
    case "accent":
      return PDF_COLORS.accent;
    case "success":
      return PDF_COLORS.success;
    case "warning":
      return PDF_COLORS.warning;
    case "danger":
      return PDF_COLORS.danger;
    case "muted":
      return PDF_COLORS.muted;
    default:
      return PDF_COLORS.navy;
  }
}

/** Üst bilgi + logo alanı + rapor no */
export function drawReportHeader(doc: jsPDF, meta: PdfReportMeta): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const generatedAt =
    meta.generatedAt || new Date().toLocaleString("tr-TR");
  const range =
    meta.startDate || meta.endDate
      ? `${meta.startDate || "-"} / ${meta.endDate || "-"}`
      : "Tum zamanlar";

  // Üst şerit
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageW, 28, "F");

  // Logo / ikon alanı (kare)
  doc.setFillColor(...PDF_COLORS.white);
  doc.roundedRect(margin, 6, 16, 16, 2, 2, "F");
  doc.setFillColor(...PDF_COLORS.accent);
  doc.circle(margin + 8, 14, 4, "F");

  doc.setTextColor(...PDF_COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(pdfText("SERVIS TAKIP SISTEMI"), margin + 22, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pdfText(meta.title), margin + 22, 20);

  const reportNo = meta.reportNo || `RPT-${Date.now().toString().slice(-8)}`;
  doc.setFontSize(8);
  doc.text(pdfText(`Rapor No: ${reportNo}`), pageW - margin, 12, {
    align: "right",
  });
  doc.text(pdfText(`Olusturma: ${generatedAt}`), pageW - margin, 18, {
    align: "right",
  });
  doc.text(pdfText(`Rapor Araligi: ${range}`), pageW - margin, 24, {
    align: "right",
  });

  // Ayırıcı
  doc.setDrawColor(...PDF_COLORS.grayBorder);
  doc.setLineWidth(0.4);
  doc.line(margin, 32, pageW - margin, 32);

  return 38;
}

/** Özet KPI kutuları (2–5 adet) */
export function drawKpiCards(
  doc: jsPDF,
  cards: PdfKpiCard[],
  startY: number
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 4;
  const usable = pageW - margin * 2;
  const count = Math.max(cards.length, 1);
  const cardW = (usable - gap * (count - 1)) / count;
  const cardH = 22;

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gap);
    const color = toneColor(card.tone);
    doc.setFillColor(...PDF_COLORS.grayLight);
    doc.setDrawColor(...PDF_COLORS.grayBorder);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, "FD");

    // Sol renk şeridi
    doc.setFillColor(...color);
    doc.rect(x, startY, 1.8, cardH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(pdfText(card.label), x + 5, startY + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(pdfText(String(card.value)), x + 5, startY + 16);
  });

  return startY + cardH + 8;
}

export function drawSectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(pdfText(text), 14, y);
  return y + 5;
}

/** Alt bilgi + sayfa numaraları (tüm sayfalar) */
export function applyFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PDF_COLORS.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text(
      pdfText(
        "Bu rapor Servis Takip Sistemi tarafindan otomatik olusturulmustur."
      ),
      14,
      pageH - 8
    );
    doc.text(pdfText(`Sayfa ${i} / ${pageCount}`), pageW - 14, pageH - 8, {
      align: "right",
    });
  }
}

export function corporateTableStyles(): Partial<UserOptions> {
  return {
    theme: "striped",
    headStyles: {
      fillColor: PDF_COLORS.grayLight,
      textColor: PDF_COLORS.navy,
      fontStyle: "bold",
      fontSize: 8,
      lineWidth: 0.1,
      lineColor: PDF_COLORS.grayBorder,
    },
    bodyStyles: {
      textColor: PDF_COLORS.text,
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: PDF_COLORS.grayBorder,
      lineWidth: 0.1,
      font: "helvetica",
    },
    margin: { left: 14, right: 14, bottom: 20 },
  };
}

export function runAutoTable(doc: jsPDF, options: UserOptions): void {
  autoTable(doc, {
    ...corporateTableStyles(),
    ...options,
    headStyles: {
      ...corporateTableStyles().headStyles,
      ...options.headStyles,
    },
    bodyStyles: {
      ...corporateTableStyles().bodyStyles,
      ...options.bodyStyles,
    },
  });
}

export function savePdf(doc: jsPDF, filename: string): void {
  applyFooters(doc);
  doc.save(filename);
}

/** Başarı oranı göstergesi (emoji yerine renkli nokta + etiket) */
export function successRateLabel(rate: number): string {
  if (rate >= 80) return `● Yuksek %${rate}`;
  if (rate >= 50) return `● Orta %${rate}`;
  return `● Dusuk %${rate}`;
}

export function successRateTone(
  rate: number
): "success" | "warning" | "danger" {
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

export function availabilityLabel(
  isAvailable: boolean,
  workload = 0
): string {
  if (!isAvailable && workload === 0) return "Pasif";
  if (!isAvailable || workload >= 5) return "Mesgul";
  return "Musait";
}

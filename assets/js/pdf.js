import { PDFDocument, StandardFonts, rgb } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
import fontkit from "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm";
import {
  buildReceiptFileName,
  downloadBlob,
  formatCurrency,
  formatDate,
  formatReceiptNumber,
} from "./utils.js";

const TEMPLATE_PATH = "./assets/templates/receipt-template.pdf";
const FONT_PATH = "./assets/fonts/YuMincho.ttf";

async function fetchArrayBuffer(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} の読み込みに失敗しました。`);
  }
  return response.arrayBuffer();
}

async function loadTemplatePdf() {
  try {
    const bytes = await fetchArrayBuffer(TEMPLATE_PATH);
    return await PDFDocument.load(bytes);
  } catch {
    return PDFDocument.create();
  }
}

function drawMultiline(page, font, text, options) {
  const lines = `${text || ""}`.split("\n");
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font,
      color: options.color || rgb(0.11, 0.11, 0.11),
      maxWidth: options.maxWidth,
    });
  });
}

export async function createReceiptPdfBytes(record) {
  const pdfDoc = await loadTemplatePdf();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await fetchArrayBuffer(FONT_PATH);
  const jpFont = await pdfDoc.embedFont(fontBytes, { subset: false });
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.getPage(0);
  if (!page) {
    page = pdfDoc.addPage([595.28, 841.89]);
  }

  const { width, height } = page.getSize();
  const ink = rgb(0.11, 0.11, 0.11);
  const accent = rgb(0.08, 0.28, 0.2);
  const soft = rgb(0.42, 0.39, 0.35);

  page.drawRectangle({
    x: 38,
    y: 42,
    width: width - 76,
    height: height - 84,
    borderColor: accent,
    borderWidth: 1.2,
  });

  page.drawText("RECEIPT", {
    x: 52,
    y: height - 94,
    size: 12,
    font: helveticaBold,
    color: accent,
  });

  page.drawText("領収書", {
    x: 52,
    y: height - 132,
    size: 28,
    font: jpFont,
    color: ink,
  });

  page.drawText(`発行日 ${formatDate(record.issueDate)}`, {
    x: width - 208,
    y: height - 120,
    size: 11,
    font: jpFont,
    color: soft,
  });

  page.drawText(formatReceiptNumber(record.receiptNumber || 1), {
    x: width - 168,
    y: height - 94,
    size: 11,
    font: helveticaBold,
    color: accent,
  });

  page.drawLine({
    start: { x: 52, y: height - 172 },
    end: { x: width - 52, y: height - 172 },
    color: rgb(0.7, 0.67, 0.61),
    thickness: 1,
  });

  page.drawText(`${record.customerName} 様`, {
    x: 52,
    y: height - 206,
    size: 18,
    font: jpFont,
    color: ink,
  });

  page.drawText("金額", {
    x: 52,
    y: height - 268,
    size: 12,
    font: jpFont,
    color: soft,
  });

  page.drawRectangle({
    x: 52,
    y: height - 334,
    width: width - 104,
    height: 58,
    borderColor: rgb(0.7, 0.67, 0.61),
    borderWidth: 1,
  });

  page.drawText(formatCurrency(record.totalAmount ?? record.amount), {
    x: 68,
    y: height - 314,
    size: 26,
    font: jpFont,
    color: ink,
  });

  page.drawText("税区分", {
    x: 52,
    y: height - 382,
    size: 12,
    font: jpFont,
    color: soft,
  });

  page.drawText(
    `${record.taxModeLabel || "内税"} / ${record.taxRateLabel || "10%対象"} / 対象額 ${formatCurrency(record.taxableAmount || 0)} / 消費税 ${formatCurrency(record.taxAmount || 0)}`,
    {
      x: 106,
      y: height - 382,
      size: 11,
      font: jpFont,
      color: ink,
      maxWidth: width - 158,
    }
  );

  page.drawText("但し", {
    x: 52,
    y: height - 430,
    size: 12,
    font: jpFont,
    color: soft,
  });

  page.drawText(record.purpose, {
    x: 106,
    y: height - 430,
    size: 14,
    font: jpFont,
    color: ink,
    maxWidth: width - 158,
  });

  page.drawText("上記正に領収いたしました。", {
    x: 52,
    y: height - 474,
    size: 12,
    font: jpFont,
    color: ink,
  });

  page.drawText("発行者", {
    x: 52,
    y: height - 526,
    size: 12,
    font: jpFont,
    color: soft,
  });

  drawMultiline(page, jpFont, record.issuerName, {
    x: 120,
    y: height - 526,
    size: 14,
    lineHeight: 20,
    maxWidth: width - 172,
  });

  page.drawText("登録番号", {
    x: 52,
    y: height - 570,
    size: 12,
    font: jpFont,
    color: soft,
  });

  page.drawText(record.issuerRegistrationNumber || "-", {
    x: 120,
    y: height - 570,
    size: 12,
    font: helveticaBold,
    color: ink,
  });

  page.drawText("住所", {
    x: 52,
    y: height - 614,
    size: 12,
    font: jpFont,
    color: soft,
  });

  drawMultiline(page, jpFont, record.issuerAddress || "-", {
    x: 120,
    y: height - 614,
    size: 12,
    lineHeight: 18,
    maxWidth: width - 172,
  });

  page.drawText("備考", {
    x: 52,
    y: height - 706,
    size: 12,
    font: jpFont,
    color: soft,
  });

  drawMultiline(page, jpFont, record.note || "-", {
    x: 120,
    y: height - 706,
    size: 12,
    lineHeight: 18,
    maxWidth: width - 172,
  });

  page.drawText(`ID: ${record.id}`, {
    x: 52,
    y: 68,
    size: 9,
    font: helvetica,
    color: soft,
  });

  return pdfDoc.save();
}

export async function generateAndDownloadReceiptPdf(record) {
  const pdfBytes = await createReceiptPdfBytes(record);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  downloadBlob(blob, buildReceiptFileName());
}

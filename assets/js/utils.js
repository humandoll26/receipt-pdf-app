export const DOC_TYPE = "receipt";
export const TEMPLATE_VERSION = "receipt_v2_invoice";

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function getTodayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatCurrency(value) {
  return `¥${Number(value).toLocaleString("ja-JP")}`;
}

export function normalizeRegistrationNumber(value) {
  return `${value || ""}`.trim().toUpperCase();
}

export function calculateTaxBreakdown(amount, taxCategory) {
  const total = Number(amount) || 0;
  const rate = Number(taxCategory) || 0;
  if (rate <= 0) {
    return {
      taxCategory: "0",
      taxRateLabel: "非課税",
      taxableAmount: total,
      taxAmount: 0,
    };
  }

  const taxableAmount = Math.floor((total * 100) / (100 + rate));
  const taxAmount = total - taxableAmount;
  return {
    taxCategory: String(rate),
    taxRateLabel: `${rate}%対象`,
    taxableAmount,
    taxAmount,
  };
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function amountToDisplayText(amount) {
  return formatCurrency(amount);
}

export function formatReceiptNumber(receiptNumber) {
  return `No. ${String(receiptNumber).padStart(4, "0")}`;
}

export function buildReceiptRecord(
  fields,
  existingId = crypto.randomUUID(),
  createdAt = nowIso(),
  receiptNumber = 1
) {
  const timestamp = nowIso();
  return {
    id: existingId,
    docType: DOC_TYPE,
    templateVersion: TEMPLATE_VERSION,
    receiptNumber,
    issueDate: fields.issueDate,
    customerName: fields.customerName,
    amount: Number(fields.amount),
    amountText: amountToDisplayText(fields.amount),
    purpose: fields.purpose,
    issuerName: fields.issuerName,
    issuerAddress: fields.issuerAddress || "",
    issuerRegistrationNumber: normalizeRegistrationNumber(fields.issuerRegistrationNumber),
    ...calculateTaxBreakdown(fields.amount, fields.taxCategory),
    note: fields.note || "",
    createdAt,
    updatedAt: timestamp,
  };
}

export function serializeForm(form) {
  const formData = new FormData(form);
  return {
    customerName: `${formData.get("customerName") || ""}`.trim(),
    amount: `${formData.get("amount") || ""}`.trim(),
    purpose: `${formData.get("purpose") || ""}`.trim(),
    issueDate: `${formData.get("issueDate") || ""}`.trim(),
    issuerName: `${formData.get("issuerName") || ""}`.trim(),
    issuerAddress: `${formData.get("issuerAddress") || ""}`.trim(),
    issuerRegistrationNumber: normalizeRegistrationNumber(formData.get("issuerRegistrationNumber")),
    taxCategory: `${formData.get("taxCategory") || "10"}`.trim(),
    note: `${formData.get("note") || ""}`.trim(),
  };
}

export function populateForm(form, record) {
  form.elements.customerName.value = record.customerName || "";
  form.elements.amount.value = record.amount ?? "";
  form.elements.purpose.value = record.purpose || "";
  form.elements.issueDate.value = record.issueDate || "";
  form.elements.issuerName.value = record.issuerName || "";
  form.elements.issuerAddress.value = record.issuerAddress || "";
  form.elements.issuerRegistrationNumber.value = record.issuerRegistrationNumber || "";
  form.elements.taxCategory.value = record.taxCategory || "10";
  form.elements.note.value = record.note || "";
}

export function clearError(container) {
  container.textContent = "";
  container.hidden = true;
}

export function showError(container, messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  container.innerHTML = list.map((message) => `<p>${escapeHtml(message)}</p>`).join("");
  container.hidden = false;
}

export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function validateReceiptFields(fields) {
  const errors = [];
  if (!fields.customerName) errors.push("宛名を入力してください。");
  if (!fields.amount) {
    errors.push("金額を入力してください。");
  } else if (!/^\d+$/.test(fields.amount)) {
    errors.push("金額は0以上の整数で入力してください。");
  }
  if (!fields.purpose) errors.push("但し書きを入力してください。");
  if (!fields.issueDate) errors.push("発行日を入力してください。");
  if (!fields.issuerName) errors.push("発行者名を入力してください。");
  if (!fields.issuerRegistrationNumber) {
    errors.push("登録番号を入力してください。");
  } else if (!/^T\d{13}$/.test(fields.issuerRegistrationNumber)) {
    errors.push("登録番号は T から始まる14文字で入力してください。");
  }
  if (!["10", "8", "0"].includes(fields.taxCategory)) {
    errors.push("税率区分を選択してください。");
  }
  return errors;
}

export function setBusyState(buttons, isBusy, busyLabel = "処理中...") {
  buttons.forEach((button) => {
    if (!button) return;
    if (!button.dataset.label) {
      button.dataset.label = button.tagName === "BUTTON" ? button.textContent : "";
    }
    if (button.tagName === "BUTTON") {
      button.textContent = isBusy ? busyLabel : button.dataset.label;
      button.disabled = isBusy;
    }
  });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildReceiptFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `receipt_${y}${m}${d}_${hh}${mm}${ss}.pdf`;
}

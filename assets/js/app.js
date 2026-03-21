import { getNextReceiptNumber, saveDocument } from "./db.js";
import { generateAndDownloadReceiptPdf, openReceiptPdfPreview } from "./pdf.js";
import {
  applyIssuerSettings,
  buildReceiptRecord,
  clearError,
  DOC_TYPE,
  getTodayString,
  loadIssuerSettings,
  qs,
  saveIssuerSettings,
  serializeForm,
  serializeIssuerSettings,
  setBusyState,
  showError,
  ensureRegistrationNumberInput,
  syncInvoiceFields,
  updateAmountPreview,
  validateReceiptFields,
} from "./utils.js";

const form = qs("#receipt-form");
const errorBox = qs("#form-error");
const generateButton = qs("#generate-button");
const previewButton = qs("#preview-button");
const saveSettingsButton = qs("#save-settings-button");
const clearButton = qs("#clear-button");

form.elements.issueDate.value = getTodayString();
applyIssuerSettings(form, loadIssuerSettings());
syncInvoiceFields(form);
updateAmountPreview(form);

form.elements.invoiceIssuerStatus.addEventListener("change", () => {
  syncInvoiceFields(form);
  ensureRegistrationNumberInput(form);
  clearError(errorBox);
});

form.elements.amount.addEventListener("input", () => updateAmountPreview(form));
form.elements.issuerRegistrationNumber.addEventListener("input", () => ensureRegistrationNumberInput(form));

saveSettingsButton.addEventListener("click", () => {
  ensureRegistrationNumberInput(form);
  saveIssuerSettings(serializeIssuerSettings(form));
  clearError(errorBox);
});

previewButton.addEventListener("click", async () => {
  clearError(errorBox);
  const fields = serializeForm(form);
  const errors = validateReceiptFields(fields);
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  setBusyState([generateButton, previewButton, saveSettingsButton, clearButton], true, "生成中...");
  try {
    const previewRecord = buildReceiptRecord(fields);
    await openReceiptPdfPreview(previewRecord);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "PDFプレビューの生成に失敗しました。");
  } finally {
    setBusyState([generateButton, previewButton, saveSettingsButton, clearButton], false);
  }
});

clearButton.addEventListener("click", () => {
  form.reset();
  form.elements.issueDate.value = getTodayString();
  form.elements.invoiceIssuerStatus.value = "invoice";
  applyIssuerSettings(form, loadIssuerSettings(), true);
  ensureRegistrationNumberInput(form);
  syncInvoiceFields(form);
  updateAmountPreview(form);
  clearError(errorBox);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(errorBox);

  const fields = serializeForm(form);
  const errors = validateReceiptFields(fields);
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  setBusyState([generateButton, previewButton, saveSettingsButton, clearButton], true, "生成中...");
  try {
    const receiptNumberInfo = await getNextReceiptNumber(DOC_TYPE, fields.issueDate);
    const record = buildReceiptRecord(fields, crypto.randomUUID(), undefined, receiptNumberInfo);
    await saveDocument(record);
    await generateAndDownloadReceiptPdf(record);
    form.reset();
    form.elements.issueDate.value = getTodayString();
    form.elements.invoiceIssuerStatus.value = "invoice";
    applyIssuerSettings(form, loadIssuerSettings(), true);
    ensureRegistrationNumberInput(form);
    syncInvoiceFields(form);
    updateAmountPreview(form);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "PDF生成中にエラーが発生しました。");
  } finally {
    setBusyState([generateButton, previewButton, saveSettingsButton, clearButton], false);
  }
});

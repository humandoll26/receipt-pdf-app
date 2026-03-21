import { saveDocument } from "./db.js";
import { generateAndDownloadReceiptPdf } from "./pdf.js";
import {
  buildReceiptRecord,
  clearError,
  getTodayString,
  qs,
  serializeForm,
  setBusyState,
  showError,
  validateReceiptFields,
} from "./utils.js";

const form = qs("#receipt-form");
const errorBox = qs("#form-error");
const generateButton = qs("#generate-button");
const clearButton = qs("#clear-button");

form.elements.issueDate.value = getTodayString();

clearButton.addEventListener("click", () => {
  form.reset();
  form.elements.issueDate.value = getTodayString();
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

  setBusyState([generateButton, clearButton], true, "生成中...");
  try {
    const record = buildReceiptRecord(fields);
    await saveDocument(record);
    await generateAndDownloadReceiptPdf(record);
    form.reset();
    form.elements.issueDate.value = getTodayString();
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "PDF生成中にエラーが発生しました。");
  } finally {
    setBusyState([generateButton, clearButton], false);
  }
});

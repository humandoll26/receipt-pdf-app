import { deleteDocument, ensureReceiptNumbers, getDocumentById, saveDocument } from "./db.js";
import { generateAndDownloadReceiptPdf } from "./pdf.js";
import {
  buildReceiptRecord,
  clearError,
  formatDateTime,
  formatReceiptNumber,
  populateForm,
  qs,
  serializeForm,
  setBusyState,
  showError,
  syncInvoiceFields,
  validateReceiptFields,
} from "./utils.js";

const form = qs("#detail-form");
const errorBox = qs("#detail-error");
const saveButton = qs("#save-button");
const downloadButton = qs("#download-button");
const deleteButton = qs("#delete-button");
const createdAtNode = qs("#detail-created-at");
const updatedAtNode = qs("#detail-updated-at");
const receiptNumberNode = qs("#detail-receipt-number");

const params = new URLSearchParams(window.location.search);
const recordId = params.get("id");
let currentRecord = null;

function syncMeta(record) {
  receiptNumberNode.textContent = `領収書番号: ${formatReceiptNumber(record.receiptNumber || 1)}`;
  createdAtNode.textContent = `作成日時: ${formatDateTime(record.createdAt)}`;
  updatedAtNode.textContent = `更新日時: ${formatDateTime(record.updatedAt)}`;
}

async function loadRecord() {
  if (!recordId) {
    showError(errorBox, "対象のIDが指定されていません。");
    setBusyState([saveButton, downloadButton, deleteButton], true);
    return;
  }

  try {
    await ensureReceiptNumbers("receipt");
    currentRecord = await getDocumentById(recordId);
    if (!currentRecord) {
      showError(errorBox, "対象の領収書が見つかりません。");
      setBusyState([saveButton, downloadButton, deleteButton], true);
      return;
    }

    populateForm(form, currentRecord);
    syncInvoiceFields(form);
    syncMeta(currentRecord);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "領収書の読み込みに失敗しました。");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(errorBox);
  if (!currentRecord) return;

  const fields = serializeForm(form);
  const errors = validateReceiptFields(fields);
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  setBusyState([saveButton, downloadButton, deleteButton], true, "保存中...");
  try {
    const nextRecord = buildReceiptRecord(
      fields,
      currentRecord.id,
      currentRecord.createdAt,
      currentRecord.receiptNumber || 1
    );
    await saveDocument(nextRecord);
    currentRecord = nextRecord;
    syncMeta(currentRecord);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "保存に失敗しました。");
  } finally {
    setBusyState([saveButton, downloadButton, deleteButton], false);
  }
});

form.elements.invoiceIssuerStatus.addEventListener("change", () => {
  syncInvoiceFields(form);
  clearError(errorBox);
});

downloadButton.addEventListener("click", async () => {
  clearError(errorBox);
  if (!currentRecord) return;

  const fields = serializeForm(form);
  const errors = validateReceiptFields(fields);
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  setBusyState([saveButton, downloadButton, deleteButton], true, "生成中...");
  try {
    const recordForPdf = buildReceiptRecord(
      fields,
      currentRecord.id,
      currentRecord.createdAt,
      currentRecord.receiptNumber || 1
    );
    await saveDocument(recordForPdf);
    currentRecord = recordForPdf;
    syncMeta(currentRecord);
    await generateAndDownloadReceiptPdf(currentRecord);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "PDF再生成に失敗しました。");
  } finally {
    setBusyState([saveButton, downloadButton, deleteButton], false);
  }
});

deleteButton.addEventListener("click", async () => {
  clearError(errorBox);
  if (!currentRecord) return;

  const confirmed = window.confirm("この領収書を削除しますか？");
  if (!confirmed) return;

  setBusyState([saveButton, downloadButton, deleteButton], true, "削除中...");
  try {
    await deleteDocument(currentRecord.id);
    window.location.href = "./history.html";
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "削除に失敗しました。");
    setBusyState([saveButton, downloadButton, deleteButton], false);
  }
});

loadRecord();

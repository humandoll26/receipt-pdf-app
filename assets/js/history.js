import {
  bulkSaveDocuments,
  deleteDocument,
  listAllDocuments,
  listDocumentsByUpdatedAtDesc,
} from "./db.js";
import {
  buildBackupPayload,
  DOC_TYPE,
  downloadBlob,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatReceiptNumber,
  matchesHistorySearch,
  parseBackupPayload,
  qs,
  setBusyState,
  showError,
} from "./utils.js";

const list = qs("#history-list");
const empty = qs("#history-empty");
const errorBox = qs("#history-error");
const exportJsonButton = qs("#export-json-button");
const importJsonButton = qs("#import-json-button");
const importJsonInput = qs("#import-json-input");
const searchInput = qs("#history-search-input");
const selectAllButton = qs("#select-all-button");
const deleteSelectedButton = qs("#delete-selected-button");

let currentRecords = [];
let allRecords = [];

function getSelectedIds() {
  return Array.from(document.querySelectorAll(".history-select:checked")).map((input) => input.value);
}

function updateSelectionUi() {
  const selectedCount = getSelectedIds().length;
  deleteSelectedButton.disabled = selectedCount === 0;
  selectAllButton.textContent =
    currentRecords.length > 0 && selectedCount === currentRecords.length ? "選択解除" : "全選択";
}

function renderHistory(records) {
  currentRecords = records;
  if (records.length === 0) {
    empty.hidden = false;
    list.innerHTML = "";
    deleteSelectedButton.disabled = true;
    selectAllButton.disabled = true;
    return;
  }

  empty.hidden = true;
  selectAllButton.disabled = false;
  list.innerHTML = records
    .map(
      (record) => `
    <div class="history-item">
      <label class="history-item-check" aria-label="${escapeHtml(record.customerName)} を選択">
        <input class="history-select" type="checkbox" value="${escapeHtml(record.id)}">
      </label>
      <a class="history-item-link" href="./detail.html?id=${encodeURIComponent(record.id)}">
        <div class="history-item-title">
          <span>${escapeHtml(record.customerName)}</span>
          <span>${escapeHtml(formatCurrency(record.totalAmount ?? record.amount))}</span>
        </div>
        <div class="history-item-meta">
          <span>領収書番号: ${escapeHtml(formatReceiptNumber(record.receiptNumber || 1))}</span>
          <span>発行日: ${escapeHtml(formatDate(record.issueDate))}</span>
          <span>更新日時: ${escapeHtml(formatDateTime(record.updatedAt))}</span>
        </div>
      </a>
    </div>
  `
    )
    .join("");

  list.querySelectorAll(".history-select").forEach((input) => {
    input.addEventListener("change", updateSelectionUi);
  });
  updateSelectionUi();
}

async function refreshHistory() {
  allRecords = await listDocumentsByUpdatedAtDesc(DOC_TYPE);
  const filtered = allRecords.filter((record) => matchesHistorySearch(record, searchInput.value));
  renderHistory(filtered);
}

selectAllButton.addEventListener("click", () => {
  const checkboxes = Array.from(list.querySelectorAll(".history-select"));
  if (checkboxes.length === 0) return;

  const shouldSelectAll = getSelectedIds().length !== checkboxes.length;
  checkboxes.forEach((checkbox) => {
    checkbox.checked = shouldSelectAll;
  });
  updateSelectionUi();
});

deleteSelectedButton.addEventListener("click", async () => {
  const selectedIds = getSelectedIds();
  if (selectedIds.length === 0) return;

  const confirmed = window.confirm(`選択した ${selectedIds.length} 件の領収書を削除しますか？`);
  if (!confirmed) return;

  setBusyState([selectAllButton, deleteSelectedButton], true, "削除中...");
  try {
    await Promise.all(selectedIds.map((id) => deleteDocument(id)));
    await refreshHistory();
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "選択した履歴の削除に失敗しました。");
  } finally {
    setBusyState([selectAllButton, deleteSelectedButton], false);
    updateSelectionUi();
  }
});

searchInput.addEventListener("input", () => {
  const filtered = allRecords.filter((record) => matchesHistorySearch(record, searchInput.value));
  renderHistory(filtered);
});

exportJsonButton.addEventListener("click", async () => {
  setBusyState([exportJsonButton], true, "書き出し中...");
  try {
    const records = await listAllDocuments(DOC_TYPE);
    const payload = buildBackupPayload(records);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `receipt_backup_${new Date().toISOString().slice(0, 10)}.json`);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "JSON書き出しに失敗しました。");
  } finally {
    setBusyState([exportJsonButton], false);
  }
});

importJsonButton.addEventListener("click", () => {
  importJsonInput.click();
});

importJsonInput.addEventListener("change", async () => {
  const file = importJsonInput.files?.[0];
  if (!file) return;

  setBusyState([importJsonButton], true, "読み込み中...");
  try {
    const text = await file.text();
    const records = parseBackupPayload(text);
    await bulkSaveDocuments(records);
    await refreshHistory();
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "JSON読み込みに失敗しました。");
  } finally {
    importJsonInput.value = "";
    setBusyState([importJsonButton], false);
  }
});

async function init() {
  try {
    await refreshHistory();
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "履歴の読み込みに失敗しました。");
  }
}

init();

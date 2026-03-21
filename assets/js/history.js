import { deleteDocument, listDocumentsByUpdatedAtDesc } from "./db.js";
import { DOC_TYPE, escapeHtml, formatCurrency, formatDate, formatDateTime, formatReceiptNumber, qs, setBusyState, showError } from "./utils.js";

const list = qs("#history-list");
const empty = qs("#history-empty");
const errorBox = qs("#history-error");
const selectAllButton = qs("#select-all-button");
const deleteSelectedButton = qs("#delete-selected-button");

let currentRecords = [];

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
  list.innerHTML = records.map((record) => `
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
  `).join("");

  list.querySelectorAll(".history-select").forEach((input) => {
    input.addEventListener("change", updateSelectionUi);
  });
  updateSelectionUi();
}

async function refreshHistory() {
  const records = await listDocumentsByUpdatedAtDesc(DOC_TYPE);
  renderHistory(records);
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

async function init() {
  try {
    await refreshHistory();
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "履歴の読み込みに失敗しました。");
  }
}

init();

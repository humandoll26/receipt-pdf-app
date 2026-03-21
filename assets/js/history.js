import { listDocumentsByUpdatedAtDesc } from "./db.js";
import { DOC_TYPE, escapeHtml, formatCurrency, formatDate, formatDateTime, formatReceiptNumber, qs, showError } from "./utils.js";

const list = qs("#history-list");
const empty = qs("#history-empty");
const errorBox = qs("#history-error");

function renderHistory(records) {
  if (records.length === 0) {
    empty.hidden = false;
    list.innerHTML = "";
    return;
  }

  empty.hidden = true;
  list.innerHTML = records.map((record) => `
    <a class="history-item" href="./detail.html?id=${encodeURIComponent(record.id)}">
      <div class="history-item-title">
        <span>${escapeHtml(record.customerName)}</span>
        <span>${escapeHtml(formatCurrency(record.amount))}</span>
      </div>
      <div class="history-item-meta">
        <span>領収書番号: ${escapeHtml(formatReceiptNumber(record.receiptNumber || 1))}</span>
        <span>発行日: ${escapeHtml(formatDate(record.issueDate))}</span>
        <span>更新日時: ${escapeHtml(formatDateTime(record.updatedAt))}</span>
      </div>
    </a>
  `).join("");
}

async function init() {
  try {
    const records = await listDocumentsByUpdatedAtDesc(DOC_TYPE);
    renderHistory(records);
  } catch (error) {
    showError(errorBox, error instanceof Error ? error.message : "履歴の読み込みに失敗しました。");
  }
}

init();

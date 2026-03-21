import {
  applyIssuerSettings,
  clearError,
  ensureRegistrationNumberInput,
  loadIssuerSettings,
  qs,
  saveIssuerSettings,
  serializeIssuerSettings,
  showError,
  syncInvoiceFields,
  validateReceiptFields,
} from "./utils.js";

const form = qs("#settings-form");
const errorBox = qs("#settings-error");
const statusBox = qs("#settings-status");
const saveButton = qs("#settings-save-button");
const clearButton = qs("#settings-clear-button");

function showStatus(message) {
  statusBox.textContent = message;
  statusBox.hidden = false;
}

function clearStatus() {
  statusBox.textContent = "";
  statusBox.hidden = true;
}

function loadSettingsIntoForm() {
  const settings = loadIssuerSettings();
  if (settings) {
    applyIssuerSettings(form, settings, true);
  } else {
    form.elements.invoiceIssuerStatus.value = "invoice";
    form.elements.issuerRegistrationNumber.value = "T";
    form.elements.taxCategory.value = "10";
    form.elements.taxMode.value = "inclusive";
  }
  ensureRegistrationNumberInput(form);
  syncInvoiceFields(form);
}

form.elements.invoiceIssuerStatus.addEventListener("change", () => {
  syncInvoiceFields(form);
  ensureRegistrationNumberInput(form);
  clearError(errorBox);
  clearStatus();
});

form.elements.issuerRegistrationNumber.addEventListener("input", () => ensureRegistrationNumberInput(form));

clearButton.addEventListener("click", () => {
  localStorage.removeItem("receipt_app_issuer_settings_v1");
  form.reset();
  form.elements.invoiceIssuerStatus.value = "invoice";
  form.elements.issuerRegistrationNumber.value = "T";
  form.elements.taxCategory.value = "10";
  form.elements.taxMode.value = "inclusive";
  syncInvoiceFields(form);
  clearError(errorBox);
  showStatus("保存済みの発行者設定を削除しました。");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError(errorBox);
  clearStatus();

  const fields = {
    customerName: "設定確認",
    amount: "0",
    purpose: "設定確認",
    issueDate: "2000-01-01",
    note: "",
    ...serializeIssuerSettings(form),
  };
  const errors = validateReceiptFields(fields).filter((message) => !message.includes("宛名") && !message.includes("金額") && !message.includes("但し書き") && !message.includes("発行日"));
  if (errors.length > 0) {
    showError(errorBox, errors);
    return;
  }

  saveIssuerSettings(serializeIssuerSettings(form));
  showStatus("発行者設定を保存しました。");
});

loadSettingsIntoForm();

import Dexie from "https://cdn.jsdelivr.net/npm/dexie@4.0.8/+esm";

const db = new Dexie("pdf_receipt_app");

db.version(1).stores({
  documents: "id, docType, issueDate, customerName, updatedAt",
});

export async function saveDocument(record) {
  await db.documents.put(record);
  return record;
}

export async function bulkSaveDocuments(records) {
  await db.documents.bulkPut(records);
}

export async function getDocumentById(id) {
  return db.documents.get(id);
}

export async function listDocumentsByUpdatedAtDesc(docType) {
  await ensureReceiptNumbers(docType);
  const records = await db.documents.where("docType").equals(docType).toArray();
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllDocuments(docType) {
  await ensureReceiptNumbers(docType);
  return db.documents.where("docType").equals(docType).toArray();
}

export async function getNextReceiptNumber(docType, issueDate) {
  await ensureReceiptNumbers(docType);
  const records = await db.documents.where("docType").equals(docType).toArray();
  const targetPrefix = buildReceiptNumberPrefix(issueDate);
  const maxReceiptSequence = records.reduce((max, record) => {
    if (record.receiptNumberPrefix !== targetPrefix) return max;
    return Math.max(max, Number(record.receiptSequence) || 0);
  }, 0);

  const receiptSequence = maxReceiptSequence + 1;
  return {
    receiptNumberPrefix: targetPrefix,
    receiptSequence,
    receiptNumber: `${targetPrefix}-${String(receiptSequence).padStart(4, "0")}`,
  };
}

export async function ensureReceiptNumbers(docType) {
  const records = await db.documents.where("docType").equals(docType).toArray();
  const missingRecords = records
    .filter((record) => !record.receiptNumberPrefix || !record.receiptSequence || !record.receiptNumber)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  if (missingRecords.length === 0) return;

  const counters = new Map();
  for (const record of records) {
    const prefix =
      record.receiptNumberPrefix ||
      extractReceiptNumberPrefix(record.receiptNumber) ||
      buildReceiptNumberPrefix(record.issueDate);
    const sequence = Number(record.receiptSequence) || extractReceiptSequence(record.receiptNumber) || 0;
    counters.set(prefix, Math.max(counters.get(prefix) || 0, sequence));
  }

  await db.transaction("rw", db.documents, async () => {
    for (const record of missingRecords) {
      const prefix = buildReceiptNumberPrefix(record.issueDate);
      const receiptSequence = (counters.get(prefix) || 0) + 1;
      counters.set(prefix, receiptSequence);
      await db.documents.put({
        ...record,
        receiptNumberPrefix: prefix,
        receiptSequence,
        receiptNumber: `${prefix}-${String(receiptSequence).padStart(4, "0")}`,
      });
    }
  });
}

export async function deleteDocument(id) {
  await db.documents.delete(id);
}

function buildReceiptNumberPrefix(issueDate) {
  const normalized = `${issueDate || ""}`.replaceAll("-", "");
  if (normalized.length >= 6) return normalized.slice(0, 6);
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function extractReceiptNumberPrefix(receiptNumber) {
  const match = `${receiptNumber || ""}`.match(/^(\d{6})-\d{4}$/);
  return match ? match[1] : "";
}

function extractReceiptSequence(receiptNumber) {
  const match = `${receiptNumber || ""}`.match(/^\d{6}-(\d{4})$/);
  return match ? Number(match[1]) : 0;
}

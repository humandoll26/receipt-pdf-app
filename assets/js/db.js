import Dexie from "https://cdn.jsdelivr.net/npm/dexie@4.0.8/+esm";

const db = new Dexie("pdf_receipt_app");

db.version(1).stores({
  documents: "id, docType, issueDate, customerName, updatedAt",
});

export async function saveDocument(record) {
  await db.documents.put(record);
  return record;
}

export async function getDocumentById(id) {
  return db.documents.get(id);
}

export async function listDocumentsByUpdatedAtDesc(docType) {
  await ensureReceiptNumbers(docType);
  const records = await db.documents.where("docType").equals(docType).toArray();
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getNextReceiptNumber(docType) {
  await ensureReceiptNumbers(docType);
  const records = await db.documents.where("docType").equals(docType).toArray();
  const maxReceiptNumber = records.reduce((max, record) => {
    const value = Number(record.receiptNumber) || 0;
    return Math.max(max, value);
  }, 0);
  return maxReceiptNumber + 1;
}

export async function ensureReceiptNumbers(docType) {
  const records = await db.documents.where("docType").equals(docType).toArray();
  let nextReceiptNumber = records.reduce((max, record) => {
    const value = Number(record.receiptNumber) || 0;
    return Math.max(max, value);
  }, 0) + 1;

  const missingRecords = records
    .filter((record) => !Number.isInteger(Number(record.receiptNumber)) || Number(record.receiptNumber) <= 0)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  if (missingRecords.length === 0) return;

  await db.transaction("rw", db.documents, async () => {
    for (const record of missingRecords) {
      await db.documents.put({
        ...record,
        receiptNumber: nextReceiptNumber,
      });
      nextReceiptNumber += 1;
    }
  });
}

export async function deleteDocument(id) {
  await db.documents.delete(id);
}

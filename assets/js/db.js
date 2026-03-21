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
  const records = await db.documents.where("docType").equals(docType).toArray();
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteDocument(id) {
  await db.documents.delete(id);
}

import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import { getPublicUrl, uploadToSupabase } from "./media.service.js";

type DocumentType =
  | "electricity_bill_receipt"
  | "holding_tax_receipt"
  | "water_bill_receipt"
  | "trade_license"
  | "nid"
  | "passport"
  | "driving_license";

async function assertOwnerOrVerifier(listingId: string, userId: number) {
  const listing = await pool.query(
    "SELECT owner_id FROM listings WHERE id=$1",
    [listingId],
  );
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");

  if (listing.rows[0].owner_id === userId) return { isOwner: true };

  const verifier = await pool.query(
    "SELECT 1 FROM verifiers WHERE user_id=$1",
    [userId],
  );
  if (verifier.rows.length > 0) return { isOwner: false };

  throw new AppError(403, "not authorized to view these documents");
}

export async function uploadListingDocument(
  listingId: string,
  ownerId: number,
  documentType: DocumentType,
  files: Express.Multer.File[],
) {
  if (files.length === 0) throw new AppError(400, "no files provided");

  const listing = await pool.query(
    "SELECT owner_id FROM listings WHERE id=$1",
    [listingId],
  );
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId)
    throw new AppError(403, "not authorized");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Re-upload of the same document_type resets verification rather than
    // piling up duplicate rows for one proof document.
    const existing = await client.query(
      "SELECT id FROM documents WHERE listing_id=$1 AND document_type=$2",
      [listingId, documentType],
    );

    let documentId: number;
    if (existing.rows.length > 0) {
      documentId = existing.rows[0].id;
      await client.query(
        "UPDATE documents SET is_verified=false, verification_type=NULL, verifier_id=NULL, uploaded_at=now() WHERE id=$1",
        [documentId],
      );
    } else {
      const inserted = await client.query(
        "INSERT INTO documents (listing_id, document_type) VALUES ($1,$2) RETURNING id",
        [listingId, documentType],
      );
      documentId = inserted.rows[0].id;
    }

    const mediaIds: number[] = [];
    for (const file of files) {
      const ext = file.mimetype.split("/")[1];
      const path = `documents/${listingId}/${documentType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      // Reuses the same storage upload the listing-image pipeline uses.
      await uploadToSupabase(path, file.buffer, file.mimetype);

      const media = await client.query(
        "INSERT INTO media (media_type, media_path, uploaded_at) VALUES ('image',$1, now()) RETURNING id",
        [path],
      );
      await client.query(
        "INSERT INTO document_media (document_id, media_id) VALUES ($1,$2)",
        [documentId, media.rows[0].id],
      );
      mediaIds.push(media.rows[0].id);
    }

    await client.query("COMMIT");
    return { documentId, mediaIds };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getListingDocuments(listingId: string, userId: number) {
  await assertOwnerOrVerifier(listingId, userId);

  const docs = await pool.query(
    `SELECT id, document_type, is_verified, verification_type, uploaded_at
     FROM documents
     WHERE listing_id=$1
     ORDER BY uploaded_at DESC`,
    [listingId],
  );
  if (docs.rows.length === 0) return [];

  const docIds = docs.rows.map((d) => d.id);
  const media = await pool.query(
    `SELECT dm.document_id, m.id, m.media_path
     FROM document_media dm
     JOIN media m ON m.id = dm.media_id
     WHERE dm.document_id = ANY($1)`,
    [docIds],
  );

  const byDocument = new Map<number, { id: number; url: string }[]>();
  for (const row of media.rows) {
    const arr = byDocument.get(row.document_id) ?? [];
    arr.push({ id: row.id, url: getPublicUrl(row.media_path) });
    byDocument.set(row.document_id, arr);
  }

  return docs.rows.map((d) => ({ ...d, media: byDocument.get(d.id) ?? [] }));
}

export async function verifyDocument(documentId: string, verifierId: number) {
  const result = await pool.query(
    "UPDATE documents SET is_verified=true, verification_type='manual', verifier_id=$1 WHERE id=$2 RETURNING id",
    [verifierId, documentId],
  );
  if (result.rows.length === 0) throw new AppError(404, "document not found");
  return result.rows[0];
}
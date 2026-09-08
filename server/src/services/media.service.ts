import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "listing-images";

async function uploadToSupabase(path: string, buffer: Buffer, contentType: string) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: buffer as unknown as BodyInit, // TODO: Learn more about the cast
  });
  if (!res.ok) {
    throw new AppError(500, `supabase upload failed: ${await res.text()}`);
  }
  return path;
}

export async function uploadListingMedia(
  listingId: string,
  ownerId: number,
  files: Express.Multer.File[]
) {
  const listing = await pool.query("SELECT owner_id FROM listings WHERE id=$1", [listingId]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId) throw new AppError(403, "not authorized");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT COUNT(*) FROM listing_media WHERE listing_id=$1",
      [listingId]
    );
    let sortOrder = Number(existing.rows[0].count);
    const mediaIds: number[] = [];

    for (const file of files) {
      const ext = file.mimetype.split("/")[1];
      const path = `listings/${listingId}/${randomUUID()}.${ext}`;
      await uploadToSupabase(path, file.buffer, file.mimetype);

      const media = await client.query(
        "INSERT INTO media (media_type, media_path, uploaded_at) VALUES ('image',$1, now()) RETURNING id",
        [path]
      );
      await client.query(
        "INSERT INTO listing_media (listing_id, media_id, sort_order) VALUES ($1,$2,$3)",
        [listingId, media.rows[0].id, sortOrder++]
      );
      mediaIds.push(media.rows[0].id);
    }
    await client.query("COMMIT");
    return mediaIds;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function deleteFromSupabase(paths: string[]) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) throw new AppError(500, `supabase delete failed: ${await res.text()}`);
}
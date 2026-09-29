import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import { CreateReviewInput, UpdateReviewInput } from "../schemas/review.schema.js";
import { uploadToSupabase, getPublicUrl, deleteFromSupabase } from "./media.service.js";
import { randomUUID } from "crypto";

export async function createReview(
  tenantId: number,
  data: CreateReviewInput,
  files?: Express.Multer.File[]
) {
  const { contract_id, rating, description } = data;

  // 1. Verify contract belongs to tenant
  const contract = await pool.query(
    "SELECT id, listing_id FROM contracts WHERE id = $1 AND tenant_id = $2",
    [contract_id, tenantId]
  );
  if (contract.rows.length === 0) {
    throw new AppError(403, "this contract does not exist or you are not the tenant");
  }

  // 2. Check for confirmed payment (also backed by database trigger)
  const payment = await pool.query(
    "SELECT 1 FROM payments WHERE contract_id = $1 AND status = 'confirmed'",
    [contract_id]
  );
  if (payment.rows.length === 0) {
    throw new AppError(400, "you must have at least 1 confirmed payment to write a review");
  }

  // 3. Ensure no existing review for this contract
  const existing = await pool.query(
    "SELECT 1 FROM reviews WHERE contract_id = $1",
    [contract_id]
  );
  if (existing.rows.length > 0) {
    throw new AppError(400, "review already exists for this contract");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO reviews (contract_id, rating, description)
       VALUES ($1, $2, $3)
       RETURNING id, contract_id, rating, description, created_at`,
      [contract_id, rating, description || null]
    );
    const review = insertResult.rows[0];

    const mediaItems: { id: number; url: string }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const ext = file.mimetype.split("/")[1] || "jpg";
        const path = `reviews/${review.id}/${randomUUID()}.${ext}`;
        await uploadToSupabase(path, file.buffer, file.mimetype);

        const mediaRes = await client.query(
          "INSERT INTO media (media_type, media_path, uploaded_at) VALUES ('image', $1, now()) RETURNING id",
          [path]
        );
        const mediaId = mediaRes.rows[0].id;

        await client.query(
          "INSERT INTO review_media (review_id, media_id) VALUES ($1, $2)",
          [review.id, mediaId]
        );

        mediaItems.push({
          id: mediaId,
          url: getPublicUrl(path),
        });
      }
    }

    await client.query("COMMIT");
    return {
      ...review,
      media: mediaItems,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getReviewForContract(contractId: number | string) {
  const result = await pool.query(
    `SELECT r.id, r.contract_id, r.rating, r.description, r.created_at
     FROM reviews r
     WHERE r.contract_id = $1`,
    [contractId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const review = result.rows[0];

  const mediaResult = await pool.query(
    `SELECT m.id, m.media_path
     FROM review_media rm
     JOIN media m ON m.id = rm.media_id
     WHERE rm.review_id = $1
     ORDER BY m.id ASC`,
    [review.id]
  );

  const media = mediaResult.rows.map((row) => ({
    id: row.id,
    url: getPublicUrl(row.media_path),
  }));

  return {
    ...review,
    media,
  };
}

export async function updateReview(
  tenantId: number,
  reviewId: number | string,
  data: UpdateReviewInput,
  files?: Express.Multer.File[]
) {
  // Check ownership
  const existing = await pool.query(
    `SELECT r.id, r.contract_id, c.tenant_id
     FROM reviews r
     JOIN contracts c ON c.id = r.contract_id
     WHERE r.id = $1`,
    [reviewId]
  );
  if (existing.rows.length === 0) {
    throw new AppError(404, "review not found");
  }
  if (existing.rows[0].tenant_id !== tenantId) {
    throw new AppError(403, "you are not authorized to edit this review");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      values.push(data.rating);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (updates.length > 0) {
      values.push(reviewId);
      await client.query(
        `UPDATE reviews SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Media pruning if keep_media_ids specified
    if (data.keep_media_ids !== undefined) {
      const currentMediaRes = await client.query(
        `SELECT m.id, m.media_path
         FROM review_media rm
         JOIN media m ON m.id = rm.media_id
         WHERE rm.review_id = $1`,
        [reviewId]
      );

      const toDelete = currentMediaRes.rows.filter(
        (m) => !data.keep_media_ids!.includes(m.id)
      );

      if (toDelete.length > 0) {
        const toDeleteIds = toDelete.map((m) => m.id);
        const toDeletePaths = toDelete.map((m) => m.media_path);

        await client.query(
          "DELETE FROM review_media WHERE review_id = $1 AND media_id = ANY($2)",
          [reviewId, toDeleteIds]
        );
        await client.query("DELETE FROM media WHERE id = ANY($1)", [toDeleteIds]);

        try {
          await deleteFromSupabase(toDeletePaths);
        } catch (supabaseErr) {
          console.error("Failed to delete review images from Supabase:", supabaseErr);
        }
      }
    }

    // Add new media files
    if (files && files.length > 0) {
      for (const file of files) {
        const ext = file.mimetype.split("/")[1] || "jpg";
        const path = `reviews/${reviewId}/${randomUUID()}.${ext}`;
        await uploadToSupabase(path, file.buffer, file.mimetype);

        const mediaRes = await client.query(
          "INSERT INTO media (media_type, media_path, uploaded_at) VALUES ('image', $1, now()) RETURNING id",
          [path]
        );
        const mediaId = mediaRes.rows[0].id;

        await client.query(
          "INSERT INTO review_media (review_id, media_id) VALUES ($1, $2)",
          [reviewId, mediaId]
        );
      }
    }

    await client.query("COMMIT");

    return await getReviewForContract(existing.rows[0].contract_id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteReview(tenantId: number, reviewId: number | string) {
  const existing = await pool.query(
    `SELECT r.id, c.tenant_id
     FROM reviews r
     JOIN contracts c ON c.id = r.contract_id
     WHERE r.id = $1`,
    [reviewId]
  );
  if (existing.rows.length === 0) {
    throw new AppError(404, "review not found");
  }
  if (existing.rows[0].tenant_id !== tenantId) {
    throw new AppError(403, "you are not authorized to delete this review");
  }

  // Get media paths to delete from storage
  const mediaRes = await pool.query(
    `SELECT m.id, m.media_path
     FROM review_media rm
     JOIN media m ON m.id = rm.media_id
     WHERE rm.review_id = $1`,
    [reviewId]
  );
  const mediaIds = mediaRes.rows.map((r) => r.id);
  const mediaPaths = mediaRes.rows.map((r) => r.media_path);

  // Delete review (cascade will delete review_media)
  await pool.query("DELETE FROM reviews WHERE id = $1", [reviewId]);

  if (mediaIds.length > 0) {
    await pool.query("DELETE FROM media WHERE id = ANY($1)", [mediaIds]);
    try {
      await deleteFromSupabase(mediaPaths);
    } catch (err) {
      console.error("Failed to delete review images from Supabase:", err);
    }
  }

  return { message: "review deleted successfully" };
}

export async function getReviewsForListing(listingId: string) {
  const listing = await pool.query("SELECT 1 FROM listings WHERE id = $1", [
    listingId,
  ]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");

  const reviewsResult = await pool.query(
    `SELECT r.id, r.contract_id, r.rating, r.description, r.created_at,
            u.name AS reviewer_name, u.id AS reviewer_id
     FROM reviews r
     JOIN contracts c ON c.id = r.contract_id
     JOIN users u ON u.id = c.tenant_id
     WHERE c.listing_id = $1
     ORDER BY r.created_at DESC`,
    [listingId]
  );

  const reviews = [];
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const row of reviewsResult.rows) {
    const star = Number(row.rating);
    if (ratingCounts[star] !== undefined) {
      ratingCounts[star]++;
    }
    ratingSum += star;

    const mediaRes = await pool.query(
      `SELECT m.id, m.media_path
       FROM review_media rm
       JOIN media m ON m.id = rm.media_id
       WHERE rm.review_id = $1
       ORDER BY m.id ASC`,
      [row.id]
    );

    const media = mediaRes.rows.map((m) => ({
      id: m.id,
      url: getPublicUrl(m.media_path),
    }));

    reviews.push({
      id: row.id,
      contract_id: row.contract_id,
      reviewer_name: row.reviewer_name,
      reviewer_id: row.reviewer_id,
      rating: star,
      description: row.description,
      created_at: row.created_at,
      media,
    });
  }

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

  return {
    reviews,
    summary: {
      total_reviews: totalReviews,
      average_rating: averageRating,
      rating_counts: ratingCounts,
    },
  };
}

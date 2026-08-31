import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";

export async function applyToListing(tenantId: number, listingId: number) {
  const listing = await pool.query(
    "SELECT 1 FROM listings WHERE id=$1 AND status='approved'",
    [listingId],
  );
  if (listing.rows.length === 0)
    throw new AppError(400, "listing does not exist");

  const existing = await pool.query(
    "SELECT 1 FROM applies WHERE tenant_id=$1 AND listing_id=$2",
    [tenantId, listingId],
  );
  if (existing.rows.length > 0)
    throw new AppError(409, "already applied to this listing");

  await pool.query(
    "INSERT INTO applies (tenant_id,listing_id) VALUES ($1,$2)",
    [tenantId, listingId],
  );
}

export async function getAllApplications(ownerId: number) {
  const isOwner = await pool.query("SELECT 1 FROM owners WHERE user_id=$1", [
    ownerId,
  ]);
  if (isOwner.rows.length === 0)
    throw new AppError(403, "you are not an owner");

  const listings = await pool.query(
    "SELECT 1 FROM listings WHERE owner_id=$1",
    [ownerId],
  );
  if (listings.rows.length === 0)
    throw new AppError(404, "you dont have any listings");

  const result = await pool.query(
    "SELECT * FROM applies a JOIN listings l ON a.listing_id=l.id WHERE l.owner_id=$1",
    [ownerId],
  );
  return result.rows;
}

export async function getApplicationsForListing(
  ownerId: number,
  listingId: string,
) {
  const isOwner = await pool.query("SELECT 1 FROM owners WHERE user_id=$1", [
    ownerId,
  ]);
  if (isOwner.rows.length === 0)
    throw new AppError(403, "you are not an owner");

  const listing = await pool.query("SELECT * FROM listings WHERE id=$1", [
    listingId,
  ]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId)
    throw new AppError(403, "not authorized");

  const result = await pool.query(
    "SELECT * FROM applies a JOIN listings l ON a.listing_id=l.id WHERE l.owner_id=$1 AND l.id=$2",
    [ownerId, listingId],
  );
  return result.rows;
}

export async function rejectApplication(
  ownerId: number,
  listingId: string,
  tenantId: string,
) {
  const isOwner = await pool.query("SELECT 1 FROM owners WHERE user_id=$1", [
    ownerId,
  ]);
  if (isOwner.rows.length === 0)
    throw new AppError(403, "you are not an owner");

  const listing = await pool.query("SELECT * FROM listings WHERE id=$1", [
    listingId,
  ]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId)
    throw new AppError(403, "not authorized");

  const application = await pool.query(
    "SELECT 1 FROM applies a JOIN listings l ON a.listing_id=l.id WHERE l.owner_id=$1 AND l.id=$2 AND a.tenant_id=$3",
    [ownerId, listingId, tenantId],
  );
  if (application.rows.length === 0)
    throw new AppError(404, "application not found");

  await pool.query(
    "UPDATE applies SET status=$1 WHERE tenant_id=$2 AND listing_id=$3",
    ["rejected", tenantId, listingId],
  );
}

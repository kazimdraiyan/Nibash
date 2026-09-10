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
    `SELECT a.tenant_id, a.listing_id, a.applied_at, a.status,
       u.name, u.email, u.phone,
       tn.monthly_income, tn.emergency_contact
    FROM applies a
    JOIN listings l ON a.listing_id = l.id
    JOIN users u ON u.id = a.tenant_id
    LEFT JOIN tenants tn ON tn.user_id = a.tenant_id
    WHERE l.owner_id = $1`,
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
    `SELECT a.tenant_id, a.listing_id, a.applied_at, a.status,
       u.name, u.email, u.phone,
       tn.monthly_income, tn.emergency_contact
FROM applies a
JOIN listings l ON a.listing_id = l.id
JOIN users u ON u.id = a.tenant_id
LEFT JOIN tenants tn ON tn.user_id = a.tenant_id
WHERE l.owner_id = $1 AND l.id = $2`,
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

export async function getMyApplications(tenantId: number) {
  const result = await pool.query(
    `SELECT 
       a.tenant_id,
       a.listing_id,
       a.applied_at,
       a.status,
       c.id AS contract_id,
       c.status AS contract_status,
       l.title,
       l.description,
       l.bedroom_count,
       l.bathroom_count,
       l.on_which_floor,
       l.area_id,
       l.owner_id,
       l.status AS listing_status,
       COALESCE(ct.rent, t.rent) AS rent,
       COALESCE(ct.electricity_bill, t.electricity_bill) AS electricity_bill,
       COALESCE(ct.water_bill, t.water_bill) AS water_bill,
       COALESCE(ct.service_charge, t.service_charge) AS service_charge,
       COALESCE(ct.monthly_due_date, t.monthly_due_date) AS monthly_due_date,
       COALESCE(ct.pet_allowed, t.pet_allowed) AS pet_allowed,
       COALESCE(ct.security_deposit, t.security_deposit) AS security_deposit,
       tn.monthly_income,
       tn.emergency_contact
     FROM applies a
     JOIN listings l ON a.listing_id = l.id
     LEFT JOIN initial_terms it ON it.listing_id = l.id
     LEFT JOIN terms t ON t.id = it.terms_id
     LEFT JOIN contracts c ON c.id = (
       SELECT c2.id FROM contracts c2
       WHERE c2.listing_id = a.listing_id AND c2.tenant_id = a.tenant_id
       ORDER BY c2.id DESC LIMIT 1
     )
     LEFT JOIN agreements ca ON ca.terms_id = c.agreement_id
     LEFT JOIN terms ct ON ct.id = ca.terms_id
     LEFT JOIN tenants tn ON tn.user_id = a.tenant_id
     WHERE a.tenant_id = $1
     ORDER BY a.applied_at DESC`,
    [tenantId],
  );
  return result.rows;
}

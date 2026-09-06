import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import {
  CreateListingInput,
  UpdateListingInput,
} from "../schemas/listing.schema.js";

export async function getAllListings() {
  const result = await pool.query(
    "SELECT l.* , t.rent FROM listings l join initial_terms it on it.listing_id=l.id join terms t on t.id= it.terms_id WHERE l.status='approved'",
  );
  return result.rows;
}

export async function getMylistings(owner : number) {
  const result= await pool.query("select l.* , t.rent FROM listings l join initial_terms it on it.listing_id=l.id join terms t on t.id= it.terms_id where l.owner_id=$1",[owner]);
  return result.rows;
  
}
export async function getListingById(
  id: string,
  ownerId?: number | null
) {
  const result = await pool.query(
    `SELECT l.*, 
            t.rent, 
            t.electricity_bill, 
            t.water_bill, 
            t.service_charge, 
            t.monthly_due_date, 
            t.pet_allowed, 
            t.security_deposit
     FROM listings l
     JOIN initial_terms it ON it.listing_id = l.id
     JOIN terms t ON t.id = it.terms_id
     WHERE l.id = $1 
       AND (l.status = 'approved' OR l.owner_id = $2)`,
    [id, ownerId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Listing not found");
  }

  return result.rows[0];
}

export async function createListing(ownerId: number, data: CreateListingInput) {
  const {
    title,
    description,
    latitude,
    longitude,
    bedroom_count,
    bathroom_count,
    on_which_floor,
    area_id,
    rent,
    electricity_bill,
    water_bill,
    service_charge,
    monthly_due_date,
    pet_allowed,
    security_deposit,
  } = data;

  const area = await pool.query("SELECT 1 FROM areas WHERE id=$1", [area_id]);
  if (area.rows.length === 0) throw new AppError(400, "area_id does not exist");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insert = await client.query(
      "INSERT INTO listings (title,description,latitude,longitude,bedroom_count,bathroom_count,on_which_floor,area_id,owner_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'waiting') RETURNING id",
      [
        title,
        description,
        latitude,
        longitude,
        bedroom_count,
        bathroom_count,
        on_which_floor,
        area_id,
        ownerId,
      ],
    );
    const listingId = insert.rows[0].id;
    const insertTerms = await client.query(
      "INSERT INTO terms (rent,electricity_bill,water_bill,service_charge,monthly_due_date,pet_allowed,security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [
        rent,
        electricity_bill,
        water_bill,
        service_charge,
        monthly_due_date,
        pet_allowed,
        security_deposit,
      ],
    );
    const termsId = insertTerms.rows[0].id;
    await client.query(
      "INSERT INTO initial_terms (listing_id,terms_id) VALUES ($1,$2)",
      [listingId, termsId],
    );
    await client.query("COMMIT");
    return listingId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateListing(
  id: string,
  ownerId: number,
  data: UpdateListingInput,
) {
  const listing = await pool.query("SELECT * FROM listings WHERE id=$1", [id]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId)
    throw new AppError(403, "not authorized");

  const {
    title,
    description,
    bedroom_count,
    bathroom_count,
    on_which_floor,
    area_id,
    rent,
    electricity_bill,
    water_bill,
    service_charge,
    monthly_due_date,
    pet_allowed,
    security_deposit,
  } = data;

  if (area_id !== undefined) {
    const area = await pool.query("SELECT 1 FROM areas WHERE id=$1", [area_id]);
    if (area.rows.length === 0)
      throw new AppError(400, "area_id does not exist");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE listings SET title=COALESCE($1,title), description=COALESCE($2,description), bedroom_count=COALESCE($3,bedroom_count), bathroom_count=COALESCE($4,bathroom_count), on_which_floor=COALESCE($5,on_which_floor), area_id=COALESCE($6,area_id) WHERE id=$7",
      [
        title ?? null,
        description ?? null,
        bedroom_count ?? null,
        bathroom_count ?? null,
        on_which_floor ?? null,
        area_id ?? null,
        id,
      ],
    );
    await client.query(
      "UPDATE terms SET rent=COALESCE($1,rent), electricity_bill=COALESCE($2,electricity_bill), water_bill=COALESCE($3,water_bill), service_charge=COALESCE($4,service_charge), monthly_due_date=COALESCE($5,monthly_due_date), pet_allowed=COALESCE($6,pet_allowed), security_deposit=COALESCE($7,security_deposit) WHERE id=(SELECT terms_id FROM initial_terms WHERE listing_id=$8)",
      [
        rent ?? null,
        electricity_bill ?? null,
        water_bill ?? null,
        service_charge ?? null,
        monthly_due_date ?? null,
        pet_allowed ?? null,
        security_deposit ?? null,
        id,
      ],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteListing(id: string, ownerId: number) {
  const listing = await pool.query("SELECT * FROM listings WHERE id=$1", [id]);
  if (listing.rows.length === 0) throw new AppError(404, "listing not found");
  if (listing.rows[0].owner_id !== ownerId)
    throw new AppError(403, "not authorized");
  await pool.query("UPDATE listings SET status='unavailable' WHERE id=$1", [
    id,
  ]);
}

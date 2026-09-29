import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import {
  CreateListingInput,
  UpdateListingInput,
} from "../schemas/listing.schema.js";
import { getPublicUrl } from "./media.service.js";

export async function getAllListings() {
  const result = await pool.query(
    "SELECT l.* , t.rent FROM listings l join initial_terms it on it.listing_id=l.id join terms t on t.id= it.terms_id WHERE l.status='approved'",
  );
  return attachMediaToListingResults(result.rows);
}
export async function searchListings(
  // Optional free-text query for a listing's title or description.
  q: string | null,
  // Optional exact number of bedrooms to match.
  bedrooms: number | null,
  // Optional area ID to match.
  areaId: number | null,
  // Optional upper limit for the monthly rent.
  maxRent: number | null,
) {
  // Every search is limited to publicly approved listings.
  const conditions = ["l.status = 'approved'"];
  // Store values separately so PostgreSQL can bind them safely to placeholders.
  const params: Array<string | number> = [];

  // Add a value to the parameters array and return its numbered SQL placeholder.
  const addParam = (value: string | number) => {
    // Append the value that will be bound by the database driver.
    params.push(value);
    // PostgreSQL placeholders are one-based, so use the new array length.
    return `$${params.length}`;
  };

  // Ignore a missing or whitespace-only text query.
  const searchTerm = q?.trim();
  if (searchTerm) {
    // Bind the search text with wildcards for a partial match.
    const placeholder = addParam(`%${searchTerm}%`);
    // Match the text in either searchable listing field, without case sensitivity.
    conditions.push(
      `(l.title ILIKE ${placeholder} OR l.description ILIKE ${placeholder})`,
    );
  }
  if (bedrooms !== null) {
    // Require the listing to have the requested number of bedrooms.
    conditions.push(`l.bedroom_count = ${addParam(bedrooms)}`);
  }
  if (areaId !== null) {
    // Require the listing to belong to the requested area.
    conditions.push(`l.area_id = ${addParam(areaId)}`);
  }
  if (maxRent !== null) {
    // Exclude listings whose rent is above the requested maximum.
    conditions.push(`t.rent <= ${addParam(maxRent)}`);
  }

  // Select listing data and rent after joining each listing to its initial terms.
  const query = `
    SELECT l.*, t.rent
    FROM listings l
    JOIN initial_terms it ON it.listing_id = l.id
    JOIN terms t ON t.id = it.terms_id
    -- Combine the approval condition with any supplied filters.
    WHERE ${conditions.join(" AND ")}
  `;
  // Execute the parameterized query using the generated placeholders and values.
  const result = await pool.query(query, params);
  // Add public media URLs before returning the matching listings.
  return attachMediaToListingResults(result.rows);
}
export async function getMylistings(owner: number) {
  const result = await pool.query(
    `SELECT l.*, t.rent,
       (SELECT c.id FROM contracts c
        WHERE c.listing_id = l.id AND c.status IN ('signed', 'active')
        ORDER BY c.id DESC LIMIT 1) AS ongoing_contract_id
     FROM listings l
     JOIN initial_terms it ON it.listing_id = l.id
     JOIN terms t ON t.id = it.terms_id
     WHERE l.owner_id = $1`,
    [owner],
  );
  return attachMediaToListingResults(result.rows);
}

// Attach media URLs to listings
async function attachMediaToListingResults(listings: any[]) {
  if (listings.length === 0) return listings;
  const ids = listings.map((l) => l.id);
  const media = await pool.query(
    `SELECT lm.listing_id, m.id, m.media_path, lm.sort_order
     FROM listing_media lm
     JOIN media m ON m.id = lm.media_id
     WHERE lm.listing_id = ANY($1)
     ORDER BY lm.sort_order`,
    [ids]
  );
  const byListing = new Map<number, any[]>();
  for (const row of media.rows) {
    const arr = byListing.get(row.listing_id) ?? [];
    arr.push({ id: row.id, url: getPublicUrl(row.media_path) });
    byListing.set(row.listing_id, arr);
  }
  return listings.map((l) => ({ ...l, images: byListing.get(l.id) ?? [] }));
}

// Attach amenities to listings
async function attachAmenitiesToListingResults(listings: any[]) {
  if (listings.length === 0) return listings;
  const ids = listings.map((l) => l.id);
  const amenitiesRes = await pool.query(
    `SELECT la.listing_id, a.id, a.name, a.description
     FROM listing_amenities la
     JOIN amenities a ON a.id = la.amenity_id
     WHERE la.listing_id = ANY($1)
     ORDER BY a.name ASC`,
    [ids]
  );
  const byListing = new Map<number, any[]>();
  for (const row of amenitiesRes.rows) {
    const arr = byListing.get(row.listing_id) ?? [];
    arr.push({ id: row.id, name: row.name, description: row.description });
    byListing.set(row.listing_id, arr);
  }
  return listings.map((l) => ({ ...l, amenities: byListing.get(l.id) ?? [] }));
}

export async function getListingById(
  id: string,
  viewerUserId?: number | null
) {
  const result = await pool.query(
    `SELECT l.*, 
            t.rent, 
            t.electricity_bill, 
             t.water_bill,
             t.service_charge,
             t.monthly_due_date,
             t.pet_allowed,
             t.security_deposit,
             CASE
               WHEN $2::integer IS NOT NULL 
                    AND l.owner_id <> $2::integer
                    AND EXISTS (
                      SELECT 1 FROM applies a
                      WHERE a.listing_id = l.id
                        AND a.tenant_id = $2::integer
                        AND a.status <> 'rejected'
                    )
               THEN u.phone
             END AS owner_phone
     FROM listings l
     JOIN initial_terms it ON it.listing_id = l.id
     JOIN terms t ON t.id = it.terms_id
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.id = $1 
       AND (l.status = 'approved' OR l.owner_id = $2 OR EXISTS (SELECT 1 FROM verifiers v WHERE v.user_id = $2))`,
    [id, viewerUserId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Listing not found");
  }

  const [withMedia] = await attachMediaToListingResults([result.rows[0]]);
  const [withAmenities] = await attachAmenitiesToListingResults([withMedia]);
  return withAmenities;
}

type Area = {
  id: number;
  latitude: number | string;
  longitude: number | string;
  radius: number | string;
};

const EARTH_RADIUS_METERS = 6_371_000;

// Areas are stored as circular regions centered on their saved coordinates.
export function findAreaIdForCoordinates(
  latitude: number,
  longitude: number,
  areas: Area[],
): number | null {
  const latitudeRadians = (latitude * Math.PI) / 180;
  let closestAreaId: number | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const area of areas) {
    const areaLatitudeRadians = (Number(area.latitude) * Math.PI) / 180;
    const latitudeDelta = areaLatitudeRadians - latitudeRadians;
    const longitudeDelta =
      ((Number(area.longitude) - longitude) * Math.PI) / 180;
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitudeRadians) *
      Math.cos(areaLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
    const distance =
      2 *
      EARTH_RADIUS_METERS *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    if (distance <= Number(area.radius) && distance < closestDistance) {
      closestAreaId = area.id;
      closestDistance = distance;
    }
  }

  return closestAreaId;
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
    rent,
    electricity_bill,
    water_bill,
    service_charge,
    monthly_due_date,
    pet_allowed,
    security_deposit,
  } = data;

  const areaResult = await pool.query<Area>(
    "SELECT id, latitude, longitude, radius FROM areas",
  );
  const areaId = findAreaIdForCoordinates(
    latitude,
    longitude,
    areaResult.rows,
  );
  if (areaId === null) {
    throw new AppError(400, "selected location is outside supported areas");
  }

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
        areaId,
        ownerId,
      ],
    );
    const listingId = insert.rows[0].id;
    const insertTerms = await client.query(
      "INSERT INTO terms (rent,electricity_bill,water_bill,service_charge,monthly_due_date,pet_allowed,security_deposit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [
        rent,
        electricity_bill ?? null,
        water_bill ?? null,
        service_charge ?? null,
        monthly_due_date ?? null,
        pet_allowed ?? false,
        security_deposit ?? null,
      ],
    );
    const termsId = insertTerms.rows[0].id;
    await client.query(
      "INSERT INTO initial_terms (listing_id,terms_id) VALUES ($1,$2)",
      [listingId, termsId],
    );

    // Insert valid amenities into listing_amenities table
    if (data.amenities && data.amenities.length > 0) {
      const validAmenities = await client.query<{ id: number }>(
        "SELECT id FROM amenities WHERE name = ANY($1)",
        [data.amenities],
      );
      if (validAmenities.rows.length > 0) {
        const values = validAmenities.rows
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        const params = [listingId, ...validAmenities.rows.map((r) => r.id)];
        await client.query(
          `INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          params,
        );
      }
    }

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
    const termsUpdates: string[] = [];
    const termsParams: any[] = [];
    let pIdx = 1;

    if (rent !== undefined) {
      termsUpdates.push(`rent = $${pIdx++}`);
      termsParams.push(rent);
    }
    if (electricity_bill !== undefined) {
      termsUpdates.push(`electricity_bill = $${pIdx++}`);
      termsParams.push(electricity_bill);
    }
    if (water_bill !== undefined) {
      termsUpdates.push(`water_bill = $${pIdx++}`);
      termsParams.push(water_bill);
    }
    if (service_charge !== undefined) {
      termsUpdates.push(`service_charge = $${pIdx++}`);
      termsParams.push(service_charge);
    }
    if (monthly_due_date !== undefined) {
      termsUpdates.push(`monthly_due_date = $${pIdx++}`);
      termsParams.push(monthly_due_date);
    }
    if (pet_allowed !== undefined) {
      termsUpdates.push(`pet_allowed = $${pIdx++}`);
      termsParams.push(pet_allowed);
    }
    if (security_deposit !== undefined) {
      termsUpdates.push(`security_deposit = $${pIdx++}`);
      termsParams.push(security_deposit);
    }

    if (termsUpdates.length > 0) {
      termsParams.push(id);
      await client.query(
        `UPDATE terms SET ${termsUpdates.join(", ")} WHERE id=(SELECT terms_id FROM initial_terms WHERE listing_id=$${pIdx})`,
        termsParams,
      );
    }

    if (data.amenities !== undefined) {
      await client.query(
        "DELETE FROM listing_amenities WHERE listing_id = $1",
        [id],
      );
      if (data.amenities.length > 0) {
        const validAmenities = await client.query<{ id: number }>(
          "SELECT id FROM amenities WHERE name = ANY($1)",
          [data.amenities],
        );
        if (validAmenities.rows.length > 0) {
          const values = validAmenities.rows
            .map((_, i) => `($1, $${i + 2})`)
            .join(", ");
          const params = [id, ...validAmenities.rows.map((r) => r.id)];
          await client.query(
            `INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ${values} ON CONFLICT DO NOTHING`,
            params,
          );
        }
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteListing(id: string, ownerId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const listing = await client.query(
      "SELECT * FROM listings WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (listing.rows.length === 0) {
      throw new AppError(404, "listing not found");
    }
    if (listing.rows[0].owner_id !== ownerId) {
      throw new AppError(403, "not authorized");
    }

    if (listing.rows[0].status === "occupied") {
      throw new AppError(
        409,
        "Cannot delete listing: this property is currently occupied.",
      );
    }

    const activeContract = await client.query(
      "SELECT 1 FROM contracts WHERE listing_id=$1 AND status IN ('signed', 'proposed')",
      [id],
    );
    if (activeContract.rows.length > 0) {
      throw new AppError(
        409,
        "Cannot delete listing: an active or proposed lease contract exists.",
      );
    }

    await client.query(
      "UPDATE listings SET status='unavailable' WHERE id=$1",
      [id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getUnverifiedListings() {
  const result = await pool.query(
    `SELECT l.*, t.rent FROM listings l
     JOIN initial_terms it ON it.listing_id = l.id
     JOIN terms t ON t.id = it.terms_id
     WHERE l.status='waiting'
     ORDER BY l.id DESC`
  );
  return attachMediaToListingResults(result.rows); // reuse the helper from the earlier images work — drop this call if you haven't added it yet
}

export async function verifyListing(id: string) {
  const result = await pool.query(
    "UPDATE listings SET status='approved' WHERE id=$1 AND status='waiting' RETURNING id",
    [id]
  );
  if (result.rows.length === 0) throw new AppError(404, "listing not found or already processed");
  return result.rows[0];
}

export async function rejectListing(id: string) {
  const result = await pool.query(
    "UPDATE listings SET status='rejected' WHERE id=$1 AND status IN ('waiting', 'approved') RETURNING id, status",
    [id]
  );
  if (result.rows.length === 0) throw new AppError(404, "listing not found or already processed");
  return result.rows[0];
}

export async function getAllAmenities() {
  const result = await pool.query(
    "SELECT id, name, description FROM amenities ORDER BY name ASC"
  );
  return result.rows;
}

export async function toggleStar(listingId: string, userId: number): Promise<boolean> {
  const isStarredResult = await pool.query(
    `SELECT 1 FROM Starred_Listings
      WHERE user_id = $1
      AND listing_id = $2;`,
    [userId, listingId]
  );
  if (isStarredResult.rows.length == 0) {
    // Add to starred
    await pool.query(
      `INSERT INTO Starred_Listings(user_id, listing_id)
        VALUES($1, $2)`,
      [userId, listingId]
    );
    return true;
  }
  else {
    // Remove from starred
    await pool.query(
      `DELETE FROM Starred_Listings
      WHERE user_id = $1
        AND listing_id = $2`,
      [userId, listingId]
    );
    return false;
  }
}

export async function getStarredListings(userId: number) {
  const result = await pool.query(
    `SELECT l.*, t.rent
     FROM listings l
     JOIN starred_listings sl ON sl.listing_id = l.id
     JOIN initial_terms it ON it.listing_id = l.id
     JOIN terms t ON t.id = it.terms_id
     WHERE sl.user_id = $1 AND l.status = 'approved'
     ORDER BY l.id DESC`,
    [userId]
  );
  return attachMediaToListingResults(result.rows);
}

export async function isListingStarred(listingId: string, userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM Starred_Listings WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId]
  );
  return result.rows.length > 0;
}
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../db/pool.js";
import { createListingSchema } from "../../schemas/listing.schema.js";
import { createListing, getListingById, updateListing } from "../listing.service.js";

test("createListingSchema accepts payload with only rent and omits optional terms", () => {
  const result = createListingSchema.safeParse({
    title: "Minimal Terms Listing",
    bedroom_count: 2,
    bathroom_count: 1,
    on_which_floor: 3,
    latitude: 23.79,
    longitude: 90.41,
    description: "Nice apartment",
    rent: 25000,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.rent, 25000);
    assert.equal(result.data.electricity_bill, undefined);
    assert.equal(result.data.water_bill, undefined);
    assert.equal(result.data.service_charge, undefined);
    assert.equal(result.data.monthly_due_date, undefined);
    assert.equal(result.data.pet_allowed, undefined);
    assert.equal(result.data.security_deposit, undefined);
  }
});

test("createListingSchema accepts payload with null values for optional terms", () => {
  const result = createListingSchema.safeParse({
    title: "Null Terms Listing",
    bedroom_count: 2,
    bathroom_count: 1,
    on_which_floor: 3,
    latitude: 23.79,
    longitude: 90.41,
    description: "Nice apartment",
    rent: 25000,
    electricity_bill: null,
    water_bill: null,
    service_charge: null,
    monthly_due_date: null,
    pet_allowed: null,
    security_deposit: null,
  });

  assert.equal(result.success, true);
});

test("createListingSchema rejects missing rent", () => {
  const result = createListingSchema.safeParse({
    title: "No Rent Listing",
    bedroom_count: 2,
    bathroom_count: 1,
    on_which_floor: 3,
    latitude: 23.79,
    longitude: 90.41,
    description: "Nice apartment",
    electricity_bill: 2000,
  });

  assert.equal(result.success, false);
});

test("createListing and updateListing with optional initial terms", async () => {
  const ownerRes = await pool.query("SELECT user_id FROM owners LIMIT 1");
  assert.ok(ownerRes.rows.length > 0, "At least one owner should exist");
  const testOwnerId = ownerRes.rows[0].user_id;

  // 1. Create listing with only required rent
  const listingId = await createListing(testOwnerId, {
    title: "Optional Terms Integration Test",
    bedroom_count: 2,
    bathroom_count: 1,
    on_which_floor: 2,
    latitude: 23.7917,
    longitude: 90.4167,
    description: "Listing with only rent provided",
    rent: 32000,
  });

  try {
    const fetched = await getListingById(String(listingId), testOwnerId);
    assert.equal(Number(fetched.rent), 32000);
    assert.equal(fetched.electricity_bill, null);
    assert.equal(fetched.water_bill, null);
    assert.equal(fetched.service_charge, null);
    assert.equal(fetched.monthly_due_date, null);
    assert.equal(fetched.security_deposit, null);
    assert.equal(fetched.pet_allowed, false);

    // 2. Update listing to add optional terms
    await updateListing(String(listingId), testOwnerId, {
      security_deposit: 64000,
      electricity_bill: 2500,
      pet_allowed: true,
    });

    const updated1 = await getListingById(String(listingId), testOwnerId);
    assert.equal(Number(updated1.security_deposit), 64000);
    assert.equal(Number(updated1.electricity_bill), 2500);
    assert.equal(updated1.pet_allowed, true);
    assert.equal(updated1.water_bill, null); // untouched, remains null

    // 3. Update listing to explicitly clear electricity_bill to null
    await updateListing(String(listingId), testOwnerId, {
      electricity_bill: null,
    });

    const updated2 = await getListingById(String(listingId), testOwnerId);
    assert.equal(updated2.electricity_bill, null);
    assert.equal(Number(updated2.security_deposit), 64000); // untouched, remains 64000
  } finally {
    await pool.query("DELETE FROM listings WHERE id = $1", [listingId]);
  }
});

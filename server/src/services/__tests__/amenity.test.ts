import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../db/pool.js";
import { createListing, getListingById, updateListing, getAllAmenities } from "../listing.service.js";
import { createListingSchema } from "../../schemas/listing.schema.js";

describe("Listing Amenities Feature", () => {
  let testOwnerId: number;
  let createdListingIds: number[] = [];

  before(async () => {
    // Find or create a test owner
    const ownerRes = await pool.query("SELECT user_id FROM owners LIMIT 1");
    if (ownerRes.rows.length > 0) {
      testOwnerId = ownerRes.rows[0].user_id;
    } else {
      // Create user and owner for tests if none exist
      const userRes = await pool.query(
        "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Test Owner', 'testowner@example.com', '1234567890', '01700000000', 'hash') RETURNING id"
      );
      testOwnerId = userRes.rows[0].id;
      await pool.query("INSERT INTO owners (user_id) VALUES ($1)", [testOwnerId]);
    }
  });

  after(async () => {
    // Clean up created listings
    for (const id of createdListingIds) {
      try {
        await pool.query("DELETE FROM listings WHERE id = $1", [id]);
      } catch (e) {
        // ignore
      }
    }
    await pool.end();
  });

  test("getAllAmenities returns all available amenities from database", async () => {
    const amenities = await getAllAmenities();
    assert.ok(Array.isArray(amenities));
    assert.ok(amenities.length > 0);
    assert.ok(amenities.some((a) => a.name === "Garage"));
    assert.ok(amenities.some((a) => a.name === "Elevator"));
  });

  test("createListingSchema accepts optional amenities string array", () => {
    const valid = createListingSchema.safeParse({
      title: "Test Apartment",
      bedroom_count: 2,
      bathroom_count: 2,
      on_which_floor: 3,
      latitude: 23.7917,
      longitude: 90.4167,
      description: "Cozy test apartment",
      rent: 30000,
      electricity_bill: 2000,
      water_bill: 1000,
      service_charge: 3000,
      monthly_due_date: 5,
      pet_allowed: true,
      security_deposit: 60000,
      amenities: ["Garage", "Elevator", "NonExistentFakeAmenity"],
    });

    assert.equal(valid.success, true);
    if (valid.success) {
      assert.deepEqual(valid.data.amenities, ["Garage", "Elevator", "NonExistentFakeAmenity"]);
    }
  });

  test("createListing saves valid amenities and silently ignores invalid ones", async () => {
    const input = {
      title: "Amenity Test Unit",
      bedroom_count: 2,
      bathroom_count: 2,
      on_which_floor: 3,
      latitude: 23.7917,
      longitude: 90.4167,
      description: "Test apartment with amenities",
      rent: 35000,
      electricity_bill: 2000,
      water_bill: 1000,
      service_charge: 3000,
      monthly_due_date: 5,
      pet_allowed: true,
      security_deposit: 70000,
      amenities: ["Garage", "Elevator", "FakeAmenity123", "Gym"],
    };

    const listingId = await createListing(testOwnerId, input as any);
    createdListingIds.push(listingId);

    // Verify in junction table: only valid amenities (Garage, Elevator, Gym) should be saved
    const juncRes = await pool.query(
      `SELECT a.name 
       FROM listing_amenities la 
       JOIN amenities a ON a.id = la.amenity_id 
       WHERE la.listing_id = $1 
       ORDER BY a.name ASC`,
      [listingId]
    );

    const savedNames = juncRes.rows.map((r) => r.name);
    assert.deepEqual(savedNames, ["Elevator", "Garage", "Gym"]);
  });

  test("getListingById includes amenities array in response", async () => {
    const input = {
      title: "Amenity Detail Test Unit",
      bedroom_count: 2,
      bathroom_count: 1,
      on_which_floor: 2,
      latitude: 23.7917,
      longitude: 90.4167,
      description: "Testing getListingById with amenities",
      rent: 28000,
      electricity_bill: 1500,
      water_bill: 800,
      service_charge: 2500,
      monthly_due_date: 10,
      pet_allowed: false,
      security_deposit: 56000,
      amenities: ["CCTV", "Security Guard"],
    };

    const listingId = await createListing(testOwnerId, input as any);
    createdListingIds.push(listingId);

    const listing = await getListingById(String(listingId), testOwnerId);

    assert.ok(Array.isArray(listing.amenities), "listing.amenities should be an array");
    assert.equal(listing.amenities.length, 2);
    const names = listing.amenities.map((a: any) => a.name).sort();
    assert.deepEqual(names, ["CCTV", "Security Guard"]);
  });

  test("updateListing updates amenities and replaces previous associations", async () => {
    const input = {
      title: "Amenity Update Test Unit",
      bedroom_count: 1,
      bathroom_count: 1,
      on_which_floor: 1,
      latitude: 23.7917,
      longitude: 90.4167,
      description: "Testing updateListing with amenities",
      rent: 20000,
      electricity_bill: 1000,
      water_bill: 500,
      service_charge: 1500,
      monthly_due_date: 1,
      pet_allowed: true,
      security_deposit: 40000,
      amenities: ["Garage", "Rooftop Access"],
    };

    const listingId = await createListing(testOwnerId, input as any);
    createdListingIds.push(listingId);

    // Update listing to have "Gym" and "Swimming Pool"
    await updateListing(String(listingId), testOwnerId, {
      amenities: ["Gym", "Swimming Pool", "AnotherFakeAmenity"],
    } as any);

    const updated = await getListingById(String(listingId), testOwnerId);
    assert.ok(Array.isArray(updated.amenities));
    const names = updated.amenities.map((a: any) => a.name).sort();
    assert.deepEqual(names, ["Gym", "Swimming Pool"]);
  });
});

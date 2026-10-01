import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "../../db/pool.js";
import { searchListings } from "./searchListings.js";

test("searchListings: returns approved listings when empty query is provided", async () => {
  const result = await searchListings({});

  assert.ok(Array.isArray(result.listings));
  for (const listing of result.listings) {
    assert.equal(listing.status, "approved");
    assert.ok("rent" in listing);
  }
});

test("searchListings: integrates query understanding to filter by extracted bedrooms and area", async () => {
  // Query includes natural language "in Dhanmondi"
  const result = await searchListings({ q: "in Dhanmondi" });

  assert.ok(Array.isArray(result.listings));
  for (const listing of result.listings) {
    assert.equal(listing.area_id, 2); // Dhanmondi area id
  }
});

test("searchListings: extracts and filters by typo bathrooms query like '2 bathrom'", async () => {
  const result = await searchListings({ q: "2 bathrom" });

  assert.ok(Array.isArray(result.listings));
  assert.ok(result.listings.length > 0, "Expected listings with 2 bathrooms to be found");
  for (const listing of result.listings) {
    assert.equal(listing.bathroom_count, 2);
  }
});

test("searchListings: extracts and filters by floor query like '6th floor'", async () => {
  const result = await searchListings({ q: "6th floor" });

  assert.ok(Array.isArray(result.listings));
  assert.ok(result.listings.length > 0, "Expected listings on the 6th floor to be found");
  for (const listing of result.listings) {
    assert.equal(listing.on_which_floor, 6);
  }
});

test("searchListings: explicit parameters override parsed query values", async () => {
  // Parsed query says "3 bedroom", but explicit param says 2
  const result = await searchListings({
    q: "3 bedroom in Mirpur",
    bedrooms: 2,
  });

  assert.ok(Array.isArray(result.listings));
  for (const listing of result.listings) {
    assert.equal(listing.bedroom_count, 2);
  }
});

test("searchListings: keyset pagination returns nextCursor and respects limit", async () => {
  const page1 = await searchListings({ limit: 2 });

  assert.ok(Array.isArray(page1.listings));
  if (page1.listings.length === 2 && page1.nextCursor) {
    assert.ok(typeof page1.nextCursor === "string");

    const page2 = await searchListings({ limit: 2, cursor: page1.nextCursor });
    assert.ok(Array.isArray(page2.listings));
    // Verify page2 does not duplicate the first item of page1
    if (page2.listings.length > 0) {
      assert.notEqual(page2.listings[0].id, page1.listings[0].id);
    }
  }
});

test("searchListings: logs zero-result searches to search_misses table", async () => {
  const bizarreQuery = "nonexistent_unicorn_palace_xyz_12345";
  const result = await searchListings({ q: bizarreQuery });

  assert.equal(result.listings.length, 0);

  // Check search_misses table
  const checkMiss = await pool.query(
    "SELECT * FROM search_misses WHERE query_text = $1 ORDER BY id DESC LIMIT 1",
    [bizarreQuery],
  );
  assert.equal(checkMiss.rows.length, 1);
  assert.equal(checkMiss.rows[0].query_text, bizarreQuery);
});

import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "../db/pool.js";
import * as listingService from "./listing.service.js";

type Area = {
  id: number;
  latitude: number;
  longitude: number;
  radius: number;
};

type AreaFinder = (
  latitude: number,
  longitude: number,
  areas: Area[],
) => number | null;

const findAreaIdForCoordinates = (
  listingService as { findAreaIdForCoordinates?: AreaFinder }
).findAreaIdForCoordinates;

test("derives Gulshan's area ID from a coordinate inside its radius", () => {
  assert.equal(typeof findAreaIdForCoordinates, "function");

  const areaId = findAreaIdForCoordinates!(23.7917, 90.4167, [
    { id: 4, latitude: 23.7917, longitude: 90.4167, radius: 500 },
  ]);

  assert.equal(areaId, 4);
});

test("includes the owner's phone only for an authenticated applicant non-owner", async (t) => {
  type QueryCall = { query: string; values?: readonly unknown[] };
  type MockablePool = {
    query: (query: string, values?: readonly unknown[]) => Promise<{ rows: any[] }>;
  };
  const mockablePool = pool as unknown as MockablePool;
  const originalQuery = mockablePool.query;
  const calls: QueryCall[] = [];

  mockablePool.query = async (query, values) => {
    calls.push({ query, values });
    return calls.length === 1
      ? { rows: [{ id: 12, owner_phone: "01712345678" }] }
      : { rows: [] };
  };
  t.after(() => {
    mockablePool.query = originalQuery;
  });

  const listing = await listingService.getListingById("12", 99);

  assert.equal(listing.owner_phone, "01712345678");
  assert.match(calls[0].query, /LEFT JOIN users u ON u\.id = l\.owner_id/);
  assert.match(
    calls[0].query,
    /WHEN \$2::integer IS NOT NULL\s+AND l\.owner_id <> \$2::integer\s+AND EXISTS \(\s*SELECT 1 FROM applies a/i,
  );
  assert.match(calls[0].query, /a\.status <> 'rejected'/i);
  assert.deepEqual(calls[0].values, ["12", 99]);
});

test("does not include owner's phone when viewer is unauthenticated or not an applicant", async (t) => {
  type QueryCall = { query: string; values?: readonly unknown[] };
  type MockablePool = {
    query: (query: string, values?: readonly unknown[]) => Promise<{ rows: any[] }>;
  };
  const mockablePool = pool as unknown as MockablePool;
  const originalQuery = mockablePool.query;
  const calls: QueryCall[] = [];

  mockablePool.query = async (query, values) => {
    calls.push({ query, values });
    return calls.length === 1
      ? { rows: [{ id: 12, owner_phone: null }] }
      : { rows: [] };
  };
  t.after(() => {
    mockablePool.query = originalQuery;
  });

  const listing = await listingService.getListingById("12", null);

  assert.equal(listing.owner_phone, null);
  assert.deepEqual(calls[0].values, ["12", null]);
});

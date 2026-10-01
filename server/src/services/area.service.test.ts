import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "../db/pool.js";
import * as areaService from "./area.service.js";

test("getAreaStats queries approved listings grouped by area with counts, min rent, and listing image", async (t) => {
  type QueryCall = { query: string; values?: readonly unknown[] };
  type MockablePool = {
    query: (query: string, values?: readonly unknown[]) => Promise<{ rows: any[] }>;
  };
  const mockablePool = pool as unknown as MockablePool;
  const originalQuery = mockablePool.query;
  const calls: QueryCall[] = [];

  mockablePool.query = async (query, values) => {
    calls.push({ query, values });
    return {
      rows: [
        {
          id: 4,
          name: "Gulshan",
          listing_count: 5,
          min_rent: 75000,
          image_path: "https://example.com/gulshan-listing.jpg",
        },
        {
          id: 5,
          name: "Banani",
          listing_count: 3,
          min_rent: 60000,
          image_path: null,
        },
      ],
    };
  };

  t.after(() => {
    mockablePool.query = originalQuery;
  });

  const stats = await areaService.getAreaStats();

  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /FROM\s+areas\s+a/i);
  assert.match(calls[0].query, /JOIN\s+listings\s+l\s+ON\s+l\.area_id\s*=\s*a\.id\s+AND\s+l\.status\s*=\s*'approved'/i);
  assert.match(calls[0].query, /LEFT\s+JOIN\s+initial_terms\s+it\s+ON\s+it\.listing_id\s*=\s*l\.id/i);
  assert.match(calls[0].query, /LEFT\s+JOIN\s+terms\s+t\s+ON\s+t\.id\s*=\s*it\.terms_id/i);
  assert.match(calls[0].query, /COUNT\(DISTINCT\s+l\.id\)::int\s+AS\s+listing_count/i);
  assert.match(calls[0].query, /MIN\(t\.rent\)::int\s+AS\s+min_rent/i);
  assert.match(calls[0].query, /SELECT\s+m\.media_path\s+FROM\s+listings\s+l2/i);
  assert.match(calls[0].query, /JOIN\s+listing_media\s+lm\s+ON\s+lm\.listing_id\s*=\s*l2\.id/i);
  assert.match(calls[0].query, /JOIN\s+media\s+m\s+ON\s+m\.id\s*=\s*lm\.media_id/i);
  assert.match(calls[0].query, /WHERE\s+l2\.area_id\s*=\s*a\.id\s+AND\s+l2\.status\s*=\s*'approved'/i);
  assert.match(calls[0].query, /GROUP\s+BY\s+a\.id,\s*a\.name/i);
  assert.match(calls[0].query, /HAVING\s+COUNT\(DISTINCT\s+l\.id\)\s*>\s*0/i);
  assert.match(calls[0].query, /ORDER\s+BY\s+COUNT\(DISTINCT\s+l\.id\)\s+DESC/i);

  assert.deepEqual(stats, [
    {
      id: 4,
      name: "Gulshan",
      listing_count: 5,
      min_rent: 75000,
      image_url: "https://example.com/gulshan-listing.jpg",
    },
    {
      id: 5,
      name: "Banani",
      listing_count: 3,
      min_rent: 60000,
      image_url: null,
    },
  ]);
});

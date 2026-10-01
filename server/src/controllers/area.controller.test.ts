import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { pool } from "../db/pool.js";
import * as areaController from "./area.controller.js";

test("getStats returns json response with areas from areaService", async (t) => {
  type MockablePool = {
    query: (query: string, values?: readonly unknown[]) => Promise<{ rows: any[] }>;
  };
  const mockablePool = pool as unknown as MockablePool;
  const originalQuery = mockablePool.query;
  const mockRows = [
    {
      id: 4,
      name: "Gulshan",
      listing_count: 5,
      min_rent: 75000,
      image_path: null,
    },
  ];

  mockablePool.query = async () => ({ rows: mockRows });

  t.after(() => {
    mockablePool.query = originalQuery;
  });

  let jsonResult: any = null;
  const req = {} as Request;
  const res = {
    json: (data: any) => {
      jsonResult = data;
      return res;
    },
  } as unknown as Response;

  await areaController.getStats(req, res);

  assert.deepEqual(jsonResult, {
    areas: [
      {
        id: 4,
        name: "Gulshan",
        listing_count: 5,
        min_rent: 75000,
        image_url: null,
      },
    ],
  });
});

import assert from "node:assert/strict";
import test from "node:test";
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

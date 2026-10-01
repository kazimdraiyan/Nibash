import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "../../db/pool.js";
import { fuzzyMatchArea } from "./fuzzyMatchArea.js";

test("fuzzyMatchArea: returns null for null, undefined, or empty area hints", async () => {
  assert.equal(await fuzzyMatchArea(null), null);
  assert.equal(await fuzzyMatchArea(undefined), null);
  assert.equal(await fuzzyMatchArea(""), null);
  assert.equal(await fuzzyMatchArea("   "), null);
});

test("fuzzyMatchArea: matches exact area names correctly", async () => {
  const result = await fuzzyMatchArea("Dhanmondi");
  assert.ok(result);
  assert.equal(result.name, "Dhanmondi");
  assert.equal(typeof result.id, "number");
});

test("fuzzyMatchArea: corrects misspelled area names using pg_trgm similarity", async () => {
  // Dhanmondy -> Dhanmondi
  const dhanmondi = await fuzzyMatchArea("Dhanmondy");
  assert.ok(dhanmondi);
  assert.equal(dhanmondi.name, "Dhanmondi");

  // Gulshaan -> Gulshan
  const gulshan = await fuzzyMatchArea("Gulshaan");
  assert.ok(gulshan);
  assert.equal(gulshan.name, "Gulshan");

  // Bananee -> Banani
  const banani = await fuzzyMatchArea("Bananee");
  assert.ok(banani);
  assert.equal(banani.name, "Banani");

  // Meerpur -> Mirpur
  const mirpur = await fuzzyMatchArea("Meerpur");
  assert.ok(mirpur);
  assert.equal(mirpur.name, "Mirpur");
});

test("fuzzyMatchArea: returns null when input is not recognizable as any area", async () => {
  const result = await fuzzyMatchArea("xyzabcdef123");
  assert.equal(result, null);
});

test.after(async () => {
  // Keep pool open or clean up if needed
});

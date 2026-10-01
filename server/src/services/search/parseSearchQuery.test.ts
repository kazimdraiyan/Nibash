import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchQuery } from "./parseSearchQuery.js";

test("parseSearchQuery: returns defaults for null, undefined, or empty queries", () => {
  const defaults = {
    bedrooms: null,
    bathrooms: null,
    floor: null,
    maxRent: null,
    pets: null,
    areaHint: null,
    keywords: "",
  };

  assert.deepEqual(parseSearchQuery(null), defaults);
  assert.deepEqual(parseSearchQuery(undefined), defaults);
  assert.deepEqual(parseSearchQuery(""), defaults);
  assert.deepEqual(parseSearchQuery("   "), defaults);
});

test("parseSearchQuery: extracts bedroom counts correctly", () => {
  assert.equal(parseSearchQuery("3 bedroom in Mirpur").bedrooms, 3);
  assert.equal(parseSearchQuery("2 bed flat").bedrooms, 2);
  assert.equal(parseSearchQuery("4 bhk luxury apartment").bedrooms, 4);
  assert.equal(parseSearchQuery("1br studio").bedrooms, 1);
  assert.equal(parseSearchQuery("2 beds with balcony").bedrooms, 2);
});

test("parseSearchQuery: extracts bathroom counts correctly including common typos and synonyms", () => {
  assert.equal(parseSearchQuery("2 bath apartment").bathrooms, 2);
  assert.equal(parseSearchQuery("3 bathrooms in Gulshan").bathrooms, 3);
  assert.equal(parseSearchQuery("2 bathrom").bathrooms, 2);
  assert.equal(parseSearchQuery("2 bathrom flat").keywords, "flat");
  assert.equal(parseSearchQuery("3 washrooms").bathrooms, 3);
  assert.equal(parseSearchQuery("2 washrom").bathrooms, 2);
});

test("parseSearchQuery: extracts floor number correctly from ordinals, numbers, and typos", () => {
  assert.equal(parseSearchQuery("6th floor").floor, 6);
  assert.equal(parseSearchQuery("6th floor in Dhanmondi").floor, 6);
  assert.equal(parseSearchQuery("6th floor in Dhanmondi").areaHint, "Dhanmondi");
  assert.equal(parseSearchQuery("6th floor in Dhanmondi").keywords, "");
  assert.equal(parseSearchQuery("floor 6 flat").floor, 6);
  assert.equal(parseSearchQuery("level 4 apartment").floor, 4);
  assert.equal(parseSearchQuery("2nd floor").floor, 2);
  assert.equal(parseSearchQuery("3rd floor").floor, 3);
  assert.equal(parseSearchQuery("6th flor").floor, 6);
  assert.equal(parseSearchQuery("ground floor").floor, 0);
});

test("parseSearchQuery: extracts max budget / rent limits correctly", () => {
  assert.equal(parseSearchQuery("flat under 30k").maxRent, 30000);
  assert.equal(parseSearchQuery("apartment below 25000").maxRent, 25000);
  assert.equal(parseSearchQuery("max 40k rent").maxRent, 40000);
  assert.equal(parseSearchQuery("budget 50000").maxRent, 50000);
  assert.equal(parseSearchQuery("up to 35k").maxRent, 35000);
});

test("parseSearchQuery: extracts pet friendliness correctly", () => {
  assert.equal(parseSearchQuery("pet friendly flat in Banani").pets, true);
  assert.equal(parseSearchQuery("pets allowed 2 bed").pets, true);
  assert.equal(parseSearchQuery("pet ok apartment").pets, true);
});

test("parseSearchQuery: extracts area hints with or without prepositions", () => {
  assert.equal(parseSearchQuery("flat in Mirpur").areaHint, "Mirpur");
  assert.equal(parseSearchQuery("near Dhanmondi lake").areaHint, "Dhanmondi");
  assert.equal(parseSearchQuery("at Gulshan 2").areaHint, "Gulshan");
  assert.equal(parseSearchQuery("Uttara 3 bed apartment").areaHint, "Uttara");
});

test("parseSearchQuery: extracts compound queries and preserves residual keywords", () => {
  const result = parseSearchQuery("luxury 3 bedroom flat in Mirpur under 30k pet friendly");

  assert.equal(result.bedrooms, 3);
  assert.equal(result.areaHint, "Mirpur");
  assert.equal(result.maxRent, 30000);
  assert.equal(result.pets, true);
  // Extracted tokens ("3 bedroom", "in Mirpur", "under 30k", "pet friendly") are stripped
  assert.equal(result.keywords, "luxury flat");
});

test("parseSearchQuery: handles plain keywords without structured filters", () => {
  const result = parseSearchQuery("rooftop generator duplex");

  assert.equal(result.bedrooms, null);
  assert.equal(result.bathrooms, null);
  assert.equal(result.maxRent, null);
  assert.equal(result.pets, null);
  assert.equal(result.areaHint, null);
  assert.equal(result.keywords, "rooftop generator duplex");
});

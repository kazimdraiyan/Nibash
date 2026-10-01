import { pool } from "../../db/pool.js";
import { getPublicUrl } from "../media.service.js";
import { parseSearchQuery } from "./parseSearchQuery.js";
import { fuzzyMatchArea } from "./fuzzyMatchArea.js";
import { logSearchMiss } from "./logSearchMiss.js";

export interface SearchListingsParams {
  q?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  areaId?: number | null;
  areaName?: string | null;
  maxRent?: number | null;
  amenityNames?: string[];
  limit?: number;
  cursor?: string | null;
}

export interface SearchCursor {
  rank?: number;
  viewCount: number;
  id: number;
}

export interface SearchListingsResult {
  listings: any[];
  nextCursor: string | null;
  total?: number;
}

function encodeCursor(data: SearchCursor): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): SearchCursor | null {
  if (!cursor || typeof cursor !== "string") return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (typeof parsed.id === "number" && typeof parsed.viewCount === "number") {
      return {
        rank: typeof parsed.rank === "number" ? parsed.rank : 0,
        viewCount: parsed.viewCount,
        id: parsed.id,
      };
    }
  } catch {
    // Malformed cursor
  }
  return null;
}

export async function searchListings(
  params: SearchListingsParams,
): Promise<SearchListingsResult> {
  const rawQuery = params.q?.trim() || "";
  const parsed = parseSearchQuery(rawQuery);

  // 1. Resolve structured filters (explicit params override parsed values)
  const bedrooms = params.bedrooms !== undefined && params.bedrooms !== null
    ? params.bedrooms
    : parsed.bedrooms;

  const bathrooms = params.bathrooms !== undefined && params.bathrooms !== null
    ? params.bathrooms
    : parsed.bathrooms;

  const floor = params.floor !== undefined && params.floor !== null
    ? params.floor
    : parsed.floor;

  const maxRent = params.maxRent !== undefined && params.maxRent !== null
    ? params.maxRent
    : parsed.maxRent;

  const pets = parsed.pets;

  let areaId: number | null = null;
  if (params.areaId !== undefined && params.areaId !== null) {
    areaId = params.areaId;
  } else if (params.areaName) {
    const matched = await fuzzyMatchArea(params.areaName);
    if (matched) areaId = matched.id;
  } else if (parsed.areaHint) {
    const matched = await fuzzyMatchArea(parsed.areaHint);
    if (matched) areaId = matched.id;
  }

  const amenityNames = params.amenityNames || [];
  const keywords = parsed.keywords.trim();
  const limit = Math.min(Math.max(params.limit || 20, 1), 50);
  const cursor = decodeCursor(params.cursor);

  // 2. Build SQL conditions
  const conditions = ["l.status = 'approved'"];
  const sqlParams: Array<any> = [];

  const addParam = (val: any) => {
    sqlParams.push(val);
    return `$${sqlParams.length}`;
  };

  if (bedrooms !== null) {
    conditions.push(`l.bedroom_count = ${addParam(bedrooms)}`);
  }

  if (bathrooms !== null) {
    conditions.push(`l.bathroom_count = ${addParam(bathrooms)}`);
  }

  if (floor !== null) {
    conditions.push(`l.on_which_floor = ${addParam(floor)}`);
  }

  if (areaId !== null) {
    conditions.push(`l.area_id = ${addParam(areaId)}`);
  }

  if (maxRent !== null) {
    conditions.push(`l.rent <= ${addParam(maxRent)}`);
  }

  if (pets === true) {
    conditions.push(`l.pet_allowed = true`);
  }

  if (amenityNames.length > 0) {
    const amenityPlaceholder = addParam(amenityNames);
    conditions.push(
      `(SELECT COUNT(DISTINCT a.name) FROM listing_amenities la JOIN amenities a ON a.id = la.amenity_id WHERE la.listing_id = l.id AND a.name = ANY(${amenityPlaceholder})) = ${amenityNames.length}`,
    );
  }

  let rows: any[] = [];

  if (keywords) {
    // Full-text search with tsvector and websearch_to_tsquery('simple', ...)
    const keywordsParam = addParam(keywords);
    conditions.push(`l.search_document @@ websearch_to_tsquery('simple', ${keywordsParam})`);

    let cursorCondition = "";
    if (cursor) {
      const cursorRankParam = addParam(cursor.rank ?? 0);
      const cursorViewParam = addParam(cursor.viewCount);
      const cursorIdParam = addParam(cursor.id);
      cursorCondition = `
        WHERE (
          rank < ${cursorRankParam}
          OR (rank = ${cursorRankParam} AND (
            view_count < ${cursorViewParam}
            OR (view_count = ${cursorViewParam} AND id < ${cursorIdParam})
          ))
        )
      `;
    }

    const limitParam = addParam(limit + 1);

    const query = `
      WITH search_candidates AS (
        SELECT
          l.*,
          (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS rating,
          (SELECT COUNT(r.id)::int FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS review_count,
          ts_rank_cd(l.search_document, websearch_to_tsquery('simple', ${keywordsParam})) AS rank
        FROM listings l
        WHERE ${conditions.join(" AND ")}
      )
      SELECT *
      FROM search_candidates
      ${cursorCondition}
      ORDER BY rank DESC, view_count DESC, id DESC
      LIMIT ${limitParam}
    `;

    const result = await pool.query(query, sqlParams);
    rows = result.rows;

    // Trigram Fallback: if full-text returns fewer than 3 results and this is the first page (no cursor)
    if (rows.length < 3 && !cursor) {
      const existingIds = rows.map((r) => r.id);
      const fallbackParams: Array<any> = [];
      const addFallbackParam = (v: any) => {
        fallbackParams.push(v);
        return `$${fallbackParams.length}`;
      };

      const fallbackConditions = ["l.status = 'approved'"];
      if (bedrooms !== null) {
        fallbackConditions.push(`l.bedroom_count = ${addFallbackParam(bedrooms)}`);
      }
      if (bathrooms !== null) {
        fallbackConditions.push(`l.bathroom_count = ${addFallbackParam(bathrooms)}`);
      }
      if (floor !== null) {
        fallbackConditions.push(`l.on_which_floor = ${addFallbackParam(floor)}`);
      }
      if (areaId !== null) {
        fallbackConditions.push(`l.area_id = ${addFallbackParam(areaId)}`);
      }
      if (maxRent !== null) {
        fallbackConditions.push(`l.rent <= ${addFallbackParam(maxRent)}`);
      }
      if (pets === true) {
        fallbackConditions.push(`l.pet_allowed = true`);
      }
      if (amenityNames.length > 0) {
        const p = addFallbackParam(amenityNames);
        fallbackConditions.push(
          `(SELECT COUNT(DISTINCT a.name) FROM listing_amenities la JOIN amenities a ON a.id = la.amenity_id WHERE la.listing_id = l.id AND a.name = ANY(${p})) = ${amenityNames.length}`,
        );
      }

      const fbKeyword = addFallbackParam(keywords);
      fallbackConditions.push(`(l.title % ${fbKeyword} OR l.description % ${fbKeyword})`);

      if (existingIds.length > 0) {
        const idArrayParam = addFallbackParam(existingIds);
        fallbackConditions.push(`l.id != ALL(${idArrayParam})`);
      }

      const fallbackLimit = addFallbackParam((limit + 1) - rows.length);

      const fallbackQuery = `
        SELECT
          l.*,
          (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS rating,
          (SELECT COUNT(r.id)::int FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS review_count,
          similarity(l.title, ${fbKeyword}) AS rank
        FROM listings l
        WHERE ${fallbackConditions.join(" AND ")}
        ORDER BY similarity(l.title, ${fbKeyword}) DESC, l.view_count DESC, l.id DESC
        LIMIT ${fallbackLimit}
      `;

      try {
        const fallbackResult = await pool.query(fallbackQuery, fallbackParams);
        rows = rows.concat(fallbackResult.rows);
      } catch (err) {
        console.error("Trigram fallback query failed:", err);
      }
    }
  } else {
    // No keywords specified: order by popularity (view_count) and recency (id)
    if (cursor) {
      const cursorViewParam = addParam(cursor.viewCount);
      const cursorIdParam = addParam(cursor.id);
      conditions.push(`
        (
          l.view_count < ${cursorViewParam}
          OR (l.view_count = ${cursorViewParam} AND l.id < ${cursorIdParam})
        )
      `);
    }

    const limitParam = addParam(limit + 1);

    const query = `
      SELECT
        l.*,
        (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS rating,
        (SELECT COUNT(r.id)::int FROM reviews r JOIN contracts c ON c.id = r.contract_id WHERE c.listing_id = l.id) AS review_count,
        0::real AS rank
      FROM listings l
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.view_count DESC, l.id DESC
      LIMIT ${limitParam}
    `;

    const result = await pool.query(query, sqlParams);
    rows = result.rows;
  }

  // Determine nextCursor
  const hasMore = rows.length > limit;
  const listingsSlice = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && listingsSlice.length > 0) {
    const lastItem = listingsSlice[listingsSlice.length - 1];
    nextCursor = encodeCursor({
      rank: typeof lastItem.rank === "number" ? Number(lastItem.rank) : 0,
      viewCount: Number(lastItem.view_count || 0),
      id: Number(lastItem.id),
    });
  }

  // Attach images
  const withImages = await attachMediaToListingResults(listingsSlice);

  // If 0 results, log search miss
  if (withImages.length === 0 && rawQuery) {
    await logSearchMiss(rawQuery, {
      keywords,
      bedrooms,
      bathrooms,
      floor,
      areaId,
      maxRent,
      pets,
      amenityNames,
    });
  }

  return {
    listings: withImages,
    nextCursor,
  };
}

async function attachMediaToListingResults(listings: any[]) {
  if (listings.length === 0) return listings;
  const ids = listings.map((l) => l.id);
  const media = await pool.query(
    `SELECT lm.listing_id, m.id, m.media_path, lm.sort_order
     FROM listing_media lm
     JOIN media m ON m.id = lm.media_id
     WHERE lm.listing_id = ANY($1)
     ORDER BY lm.sort_order`,
    [ids],
  );
  const byListing = new Map<number, any[]>();
  for (const row of media.rows) {
    const arr = byListing.get(row.listing_id) ?? [];
    arr.push({ id: row.id, url: getPublicUrl(row.media_path) });
    byListing.set(row.listing_id, arr);
  }
  return listings.map((l) => ({ ...l, images: byListing.get(l.id) ?? [] }));
}

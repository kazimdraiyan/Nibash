import { pool } from "../../db/pool.js";

export interface MatchedArea {
  id: number;
  name: string;
}

export async function fuzzyMatchArea(
  areaHint: string | null | undefined,
): Promise<MatchedArea | null> {
  if (!areaHint || typeof areaHint !== "string") {
    return null;
  }

  const query = areaHint.trim();
  if (!query) {
    return null;
  }

  // 1. Direct case-insensitive match
  const exactResult = await pool.query<MatchedArea>(
    "SELECT id, name FROM areas WHERE LOWER(name) = LOWER($1) LIMIT 1",
    [query],
  );

  if (exactResult.rows.length > 0) {
    return exactResult.rows[0];
  }

  // 2. Trigram similarity match using pg_trgm
  const fuzzyResult = await pool.query<MatchedArea & { sim: number }>(
    `SELECT id, name, similarity(name, $1) AS sim
     FROM areas
     WHERE similarity(name, $1) > 0.3
     ORDER BY sim DESC
     LIMIT 1`,
    [query],
  );

  if (fuzzyResult.rows.length > 0) {
    return {
      id: fuzzyResult.rows[0].id,
      name: fuzzyResult.rows[0].name,
    };
  }

  return null;
}

import { pool } from "../../db/pool.js";

export async function logSearchMiss(
  queryText: string,
  parsedFilters: Record<string, any>,
): Promise<void> {
  const clean = queryText?.trim();
  if (!clean) return;

  try {
    await pool.query(
      `INSERT INTO search_misses (query_text, parsed_filters)
       VALUES ($1, $2)`,
      [clean, JSON.stringify(parsedFilters)],
    );
  } catch (err) {
    // Zero-result logging is telemetry; it must never fail user requests
    console.error("Failed to log search miss:", err);
  }
}

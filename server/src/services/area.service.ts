import { pool } from "../db/pool.js";

export interface AreaStat {
  id: number;
  name: string;
  listing_count: number;
  min_rent: number | null;
}

export async function getAreaStats(): Promise<AreaStat[]> {
  const result = await pool.query(`
    SELECT a.id, a.name,
           COUNT(l.id)::int AS listing_count,
           MIN(t.rent)::int AS min_rent
    FROM areas a
    LEFT JOIN listings l ON l.area_id = a.id AND l.status = 'approved'
    LEFT JOIN initial_terms it ON it.listing_id = l.id
    LEFT JOIN terms t ON t.id = it.terms_id
    GROUP BY a.id, a.name
    HAVING COUNT(l.id) > 0
    ORDER BY COUNT(l.id) DESC
  `);
  return result.rows;
}

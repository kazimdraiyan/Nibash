import { pool } from "../db/pool.js";
import { getPublicUrl } from "./media.service.js";

export interface AreaStat {
  id: number;
  name: string;
  listing_count: number;
  min_rent: number | null;
  image_url: string | null;
}

export async function getAreaStats(): Promise<AreaStat[]> {
  const result = await pool.query(`
    SELECT a.id, a.name,
           COUNT(DISTINCT l.id)::int AS listing_count,
           MIN(t.rent)::int AS min_rent,
           (
             SELECT m.media_path
             FROM listings l2
             JOIN listing_media lm ON lm.listing_id = l2.id
             JOIN media m ON m.id = lm.media_id
             WHERE l2.area_id = a.id AND l2.status = 'approved' AND m.media_type = 'image'
             ORDER BY lm.sort_order ASC, lm.media_id ASC
             LIMIT 1
           ) AS image_path
    FROM areas a
    JOIN listings l ON l.area_id = a.id AND l.status = 'approved'
    LEFT JOIN initial_terms it ON it.listing_id = l.id
    LEFT JOIN terms t ON t.id = it.terms_id
    GROUP BY a.id, a.name
    HAVING COUNT(DISTINCT l.id) > 0
    ORDER BY COUNT(DISTINCT l.id) DESC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    listing_count: row.listing_count,
    min_rent: row.min_rent,
    image_url: row.image_path
      ? row.image_path.startsWith("http://") || row.image_path.startsWith("https://")
        ? row.image_path
        : getPublicUrl(row.image_path)
      : null,
  }));
}

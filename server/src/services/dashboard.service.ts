import { pool } from "../db/pool.js";

export interface PlatformOverview {
  total_users: number;
  total_owners: number;
  total_tenants: number;
  listings_approved: number;
  listings_waiting: number;
  listings_rejected: number;
  listings_occupied: number;
  active_contracts: number;
}

export interface GrowthTrendItem {
  week: string;
  count: number;
}

export interface GrowthTrends {
  signups_per_week: GrowthTrendItem[];
  listings_per_week: GrowthTrendItem[];
  contracts_per_week: GrowthTrendItem[];
  applications_per_week: GrowthTrendItem[];
}

export interface OwnerListingCount {
  owner_id: number;
  name: string;
  email: string;
  phone: string;
  listing_count: number;
}

export interface ConcurrentTenant {
  tenant_id: number;
  name: string;
  email: string;
  phone: string;
  active_contract_count: number;
  listing_ids: number[];
}

export interface RentOutlier {
  listing_id: number;
  title: string;
  owner_name: string;
  area_name: string;
  rent: number;
  typical_area_rent: number;
  difference_pct: number;
}

export interface ListingNoPhotos {
  listing_id: number;
  title: string;
  status: string;
  owner_name: string;
  owner_email: string;
  area_name: string;
}

export interface DuplicateLocation {
  listing_1_id: number;
  listing_1_title: string;
  owner_1_name: string;
  listing_2_id: number;
  listing_2_title: string;
  owner_2_name: string;
  area_name: string;
  lat_diff: number;
  lng_diff: number;
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int                                    AS total_users,
      (SELECT COUNT(*) FROM owners)::int                                   AS total_owners,
      (SELECT COUNT(*) FROM tenants)::int                                  AS total_tenants,
      (SELECT COUNT(*) FROM listings WHERE status = 'approved')::int       AS listings_approved,
      (SELECT COUNT(*) FROM listings WHERE status = 'waiting')::int        AS listings_waiting,
      (SELECT COUNT(*) FROM listings WHERE status = 'rejected')::int       AS listings_rejected,
      (SELECT COUNT(*) FROM listings WHERE status = 'occupied')::int       AS listings_occupied,
      (SELECT COUNT(*) FROM contracts WHERE status = 'signed')::int        AS active_contracts
  `);
  return result.rows[0];
}

export async function getGrowthTrends(): Promise<GrowthTrends> {
  const signups = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                          AS count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at) ASC
  `);

  const newListings = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                          AS count
    FROM listings
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at) ASC
  `);

  const newContracts = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp)), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                                                           AS count
    FROM contracts
    WHERE COALESCE(created_at, start_date::timestamp) >= NOW() - INTERVAL '8 weeks'
      AND status = 'signed'
    GROUP BY DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp))
    ORDER BY DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp)) ASC
  `);

  const newApplications = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', applied_at), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                          AS count
    FROM applies
    WHERE applied_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', applied_at)
    ORDER BY DATE_TRUNC('week', applied_at) ASC
  `);

  return {
    signups_per_week: signups.rows,
    listings_per_week: newListings.rows,
    contracts_per_week: newContracts.rows,
    applications_per_week: newApplications.rows,
  };
}

export async function getOwnersByListingCount(): Promise<OwnerListingCount[]> {
  const result = await pool.query(`
    SELECT
      u.id             AS owner_id,
      u.name,
      u.email,
      u.phone,
      COUNT(l.id)::int AS listing_count
    FROM users u
    JOIN owners o  ON o.user_id = u.id
    JOIN listings l ON l.owner_id = o.user_id
    WHERE l.status != 'unavailable'
    GROUP BY u.id, u.name, u.email, u.phone
    ORDER BY listing_count DESC
  `);
  return result.rows;
}

export async function getConcurrentTenants(): Promise<ConcurrentTenant[]> {
  const result = await pool.query(`
    SELECT
      u.id                      AS tenant_id,
      u.name,
      u.email,
      u.phone,
      COUNT(c.id)::int          AS active_contract_count,
      ARRAY_AGG(c.listing_id)   AS listing_ids
    FROM users u
    JOIN tenants ten ON ten.user_id = u.id
    JOIN contracts c ON c.tenant_id = ten.user_id
    WHERE c.status = 'signed'
    GROUP BY u.id, u.name, u.email, u.phone
    HAVING COUNT(c.id) > 1
    ORDER BY active_contract_count DESC
  `);
  return result.rows;
}

export async function getRentOutliers(): Promise<RentOutlier[]> {
  const result = await pool.query(`
    WITH area_stats AS (
      -- Step 1: Initial neighborhood baseline stats
      SELECT
        l.area_id,
        a.name                 AS area_name,
        AVG(t.rent)            AS initial_avg,
        STDDEV_POP(t.rent)     AS stddev_rent,
        COUNT(*)::int          AS listing_count
      FROM listings l
      JOIN initial_terms it ON it.listing_id = l.id
      JOIN terms t          ON t.id = it.terms_id
      JOIN areas a          ON a.id = l.area_id
      WHERE l.status NOT IN ('unavailable', 'rejected')
      GROUP BY l.area_id, a.name
      HAVING COUNT(*) >= 3
    ),
    clean_area_stats AS (
      -- Step 2: Re-average ONLY non-outlier properties in the neighborhood
      SELECT
        l.area_id,
        AVG(t.rent)            AS clean_avg_rent
      FROM listings l
      JOIN initial_terms it ON it.listing_id = l.id
      JOIN terms t          ON t.id = it.terms_id
      JOIN area_stats s     ON s.area_id = l.area_id
      WHERE l.status NOT IN ('unavailable', 'rejected')
        -- Keep listings that are within 2 standard deviations
        AND (s.stddev_rent = 0 OR ABS(t.rent - s.initial_avg) <= 2 * s.stddev_rent)
      GROUP BY l.area_id
    )
    SELECT
      l.id                                                       AS listing_id,
      l.title,
      u.name                                                     AS owner_name,
      s.area_name,
      t.rent::float                                              AS rent,
      ROUND(COALESCE(c.clean_avg_rent, s.initial_avg)::numeric, 0)::float AS typical_area_rent,
      ROUND(
        (((t.rent - COALESCE(c.clean_avg_rent, s.initial_avg)) / NULLIF(COALESCE(c.clean_avg_rent, s.initial_avg), 0)) * 100)::numeric,
        0
      )::int                                                     AS difference_pct
    FROM listings l
    JOIN initial_terms it   ON it.listing_id = l.id
    JOIN terms t            ON t.id = it.terms_id
    JOIN area_stats s       ON s.area_id = l.area_id
    LEFT JOIN clean_area_stats c ON c.area_id = l.area_id
    JOIN users u            ON u.id = l.owner_id
    WHERE ABS(t.rent - s.initial_avg) > 2 * s.stddev_rent
      AND s.stddev_rent > 0
      AND l.status NOT IN ('unavailable', 'rejected')
    ORDER BY ABS(t.rent - s.initial_avg) DESC
  `);
  return result.rows;
}

export async function getListingsWithNoPhotos(): Promise<ListingNoPhotos[]> {
  const result = await pool.query(`
    SELECT
      l.id       AS listing_id,
      l.title,
      l.status,
      u.name     AS owner_name,
      u.email    AS owner_email,
      a.name     AS area_name
    FROM listings l
    JOIN users u ON u.id = l.owner_id
    JOIN areas a ON a.id = l.area_id
    LEFT JOIN listing_media lm ON lm.listing_id = l.id
    WHERE lm.listing_id IS NULL
      AND l.status NOT IN ('unavailable')
    ORDER BY l.id DESC
  `);
  return result.rows;
}

export async function getDuplicateLocations(): Promise<DuplicateLocation[]> {
  const result = await pool.query(`
    SELECT
      l1.id        AS listing_1_id,
      l1.title     AS listing_1_title,
      u1.name      AS owner_1_name,
      l2.id        AS listing_2_id,
      l2.title     AS listing_2_title,
      u2.name      AS owner_2_name,
      a.name       AS area_name,
      ROUND(ABS(l1.latitude  - l2.latitude)::numeric,  6)::float AS lat_diff,
      ROUND(ABS(l1.longitude - l2.longitude)::numeric, 6)::float AS lng_diff
    FROM listings l1
    JOIN listings l2 ON l1.id < l2.id
                    AND l1.owner_id != l2.owner_id
                    AND ABS(l1.latitude  - l2.latitude)  < 0.0005
                    AND ABS(l1.longitude - l2.longitude) < 0.0005
    JOIN users u1 ON u1.id = l1.owner_id
    JOIN users u2 ON u2.id = l2.owner_id
    JOIN areas a  ON a.id  = l1.area_id
    WHERE l1.status NOT IN ('unavailable', 'rejected')
      AND l2.status NOT IN ('unavailable', 'rejected')
    ORDER BY (ABS(l1.latitude - l2.latitude) + ABS(l1.longitude - l2.longitude)) ASC
  `);
  return result.rows;
}

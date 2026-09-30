import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import { ensureOwner } from "./user.service.js";
import { getPublicUrl } from "./media.service.js";
import type { IncomeQueryParams, PaginationParams } from "../schemas/income.schema.js";

export function resolveDateRange(params: IncomeQueryParams): {
  fromStr: string | null;
  toStr: string | null;
} {
  const now = new Date();
  if (params.period === "this_month") {
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return {
      fromStr: start.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
      toStr: end.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
    };
  } else if (params.period === "last_month") {
    const y = now.getFullYear();
    const m = now.getMonth() - 1;
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return {
      fromStr: start.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
      toStr: end.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
    };
  } else if (params.period === "last_3_months") {
    const y = now.getFullYear();
    const m = now.getMonth() - 2;
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    return {
      fromStr: start.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
      toStr: end.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
    };
  } else if (params.period === "last_6_months") {
    const y = now.getFullYear();
    const m = now.getMonth() - 5;
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    return {
      fromStr: start.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
      toStr: end.toISOString().replace("T", " ").replace("Z", "").slice(0, 19),
    };
  } else if (params.period === "custom" || params.from || params.to) {
    const fromStr = params.from ? `${params.from} 00:00:00` : null;
    const toStr = params.to ? `${params.to} 23:59:59` : null;
    return { fromStr, toStr };
  }
  return { fromStr: null, toStr: null };
}

/**
 * Validates that if listingId or contractId is provided, it belongs to the authenticated owner.
 */
async function validateOwnerResourceAccess(
  ownerId: number,
  listingId?: number,
  contractId?: number,
): Promise<void> {
  if (listingId !== undefined) {
    const check = await pool.query(
      "SELECT 1 FROM listings WHERE id = $1 AND owner_id = $2",
      [listingId, ownerId],
    );
    if (check.rows.length === 0) {
      throw new AppError(403, "you are not the owner of this listing");
    }
  }

  if (contractId !== undefined) {
    const check = await pool.query(
      `SELECT 1 FROM contracts c
       JOIN listings l ON l.id = c.listing_id
       WHERE c.id = $1 AND l.owner_id = $2`,
      [contractId, ownerId],
    );
    if (check.rows.length === 0) {
      throw new AppError(403, "you are not the owner of this contract");
    }
  }
}

/**
 * Returns overall rental income metrics for the authenticated owner.
 */
export async function getOverallIncome(
  ownerId: number,
  query: IncomeQueryParams,
) {
  await ensureOwner(ownerId);
  const { fromStr, toStr } = resolveDateRange(query);

  const queryParams: any[] = [ownerId];
  let dateConditions = "";

  if (fromStr) {
    queryParams.push(fromStr);
    dateConditions += ` AND p.paid_at >= $${queryParams.length}::timestamp`;
  }
  if (toStr) {
    queryParams.push(toStr);
    dateConditions += ` AND p.paid_at <= $${queryParams.length}::timestamp`;
  }

  const sql = `
    SELECT
      COALESCE(SUM(p.amount), 0)::numeric AS total_rent_received,
      COALESCE(SUM(
        CASE
          WHEN p.paid_at >= date_trunc('month', CURRENT_TIMESTAMP)
           AND p.paid_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
          THEN p.amount
          ELSE 0
        END
      ), 0)::numeric AS current_month_rent_received,
      COUNT(DISTINCT c.id) FILTER (WHERE p.id IS NOT NULL)::int AS income_generating_contracts,
      COUNT(DISTINCT l.id) FILTER (WHERE p.id IS NOT NULL)::int AS income_generating_listings,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('signed', 'active'))::int AS active_contracts_count,
      COUNT(DISTINCT l.id)::int AS total_owned_listings
    FROM listings l
    LEFT JOIN contracts c ON c.listing_id = l.id
    LEFT JOIN payments p ON p.contract_id = c.id
                        AND p.status = 'confirmed'
                        ${dateConditions}
    WHERE l.owner_id = $1
  `;

  const result = await pool.query(sql, queryParams);
  const row = result.rows[0] || {};

  return {
    currency: "BDT",
    period: query.period,
    from: query.from || null,
    to: query.to || null,
    totalRentReceived: parseFloat(row.total_rent_received || "0"),
    currentMonthRentReceived: parseFloat(row.current_month_rent_received || "0"),
    incomeGeneratingListings: parseInt(row.income_generating_listings || "0", 10),
    incomeGeneratingContracts: parseInt(row.income_generating_contracts || "0", 10),
    activeContractsCount: parseInt(row.active_contracts_count || "0", 10),
    totalOwnedListings: parseInt(row.total_owned_listings || "0", 10),
  };
}

/**
 * Returns rental income grouped by listing for the authenticated owner.
 */
export async function getListingIncome(
  ownerId: number,
  query: IncomeQueryParams,
) {
  await ensureOwner(ownerId);
  const { fromStr, toStr } = resolveDateRange(query);

  const queryParams: any[] = [ownerId];
  let dateConditions = "";

  if (fromStr) {
    queryParams.push(fromStr);
    dateConditions += ` AND p.paid_at >= $${queryParams.length}::timestamp`;
  }
  if (toStr) {
    queryParams.push(toStr);
    dateConditions += ` AND p.paid_at <= $${queryParams.length}::timestamp`;
  }

  const sql = `
    SELECT
      l.id AS listing_id,
      l.title,
      l.status AS listing_status,
      a.name AS area_name,
      a.city AS city,
      COALESCE(t.rent, 0)::numeric AS advertised_rent,
      COALESCE(SUM(p.amount), 0)::numeric AS total_rent_received,
      COUNT(DISTINCT c.id) FILTER (WHERE p.id IS NOT NULL)::int AS contributing_contracts_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('signed', 'active'))::int AS active_contracts_count,
      MAX(p.paid_at) AS most_recent_payment_date
    FROM listings l
    JOIN areas a ON a.id = l.area_id
    LEFT JOIN initial_terms it ON it.listing_id = l.id
    LEFT JOIN terms t ON t.id = it.terms_id
    LEFT JOIN contracts c ON c.listing_id = l.id
    LEFT JOIN payments p ON p.contract_id = c.id
                        AND p.status = 'confirmed'
                        ${dateConditions}
    WHERE l.owner_id = $1
    GROUP BY l.id, l.title, l.status, a.name, a.city, t.rent
    ORDER BY total_rent_received DESC, l.id DESC
  `;

  const result = await pool.query(sql, queryParams);
  const rawListings = result.rows;

  if (rawListings.length === 0) return [];

  // Attach primary photo thumbnail for each listing
  const listingIds = rawListings.map((l: any) => l.listing_id);
  const mediaRes = await pool.query(
    `SELECT lm.listing_id, m.id, m.media_path, lm.sort_order
     FROM listing_media lm
     JOIN media m ON m.id = lm.media_id
     WHERE lm.listing_id = ANY($1)
     ORDER BY lm.sort_order ASC`,
    [listingIds],
  );

  const thumbnailMap = new Map<number, string>();
  for (const m of mediaRes.rows) {
    if (!thumbnailMap.has(m.listing_id)) {
      thumbnailMap.set(m.listing_id, getPublicUrl(m.media_path));
    }
  }

  return rawListings.map((row: any) => ({
    listingId: row.listing_id,
    title: row.title,
    listingStatus: row.listing_status,
    areaName: row.area_name,
    city: row.city,
    advertisedRent: parseFloat(row.advertised_rent || "0"),
    totalRentReceived: parseFloat(row.total_rent_received || "0"),
    contributingContractsCount: parseInt(row.contributing_contracts_count || "0", 10),
    activeContractsCount: parseInt(row.active_contracts_count || "0", 10),
    mostRecentPaymentDate: row.most_recent_payment_date || null,
    thumbnailUrl: thumbnailMap.get(row.listing_id) || null,
  }));
}

/**
 * Returns rental income grouped by contract for the authenticated owner.
 */
export async function getContractIncome(
  ownerId: number,
  query: IncomeQueryParams,
) {
  await ensureOwner(ownerId);
  await validateOwnerResourceAccess(ownerId, query.listing_id, query.contract_id);

  const { fromStr, toStr } = resolveDateRange(query);
  const queryParams: any[] = [ownerId];
  let dateConditions = "";
  let extraFilters = "";

  if (fromStr) {
    queryParams.push(fromStr);
    dateConditions += ` AND p.paid_at >= $${queryParams.length}::timestamp`;
  }
  if (toStr) {
    queryParams.push(toStr);
    dateConditions += ` AND p.paid_at <= $${queryParams.length}::timestamp`;
  }

  if (query.listing_id) {
    queryParams.push(query.listing_id);
    extraFilters += ` AND c.listing_id = $${queryParams.length}`;
  }

  if (query.contract_id) {
    queryParams.push(query.contract_id);
    extraFilters += ` AND c.id = $${queryParams.length}`;
  }

  const sql = `
    SELECT
      c.id AS contract_id,
      c.listing_id,
      l.title AS listing_title,
      c.status AS contract_status,
      c.start_date,
      c.end_date,
      u.name AS tenant_name,
      u.email AS tenant_email,
      u.phone AS tenant_phone,
      COALESCE(t.rent, 0)::numeric AS agreed_monthly_rent,
      COALESCE(SUM(p.amount), 0)::numeric AS total_rent_received,
      COUNT(p.id)::int AS confirmed_payments_count,
      MAX(p.paid_at) AS most_recent_payment_date
    FROM contracts c
    JOIN listings l ON l.id = c.listing_id
    JOIN users u ON u.id = c.tenant_id
    JOIN agreements ag ON ag.terms_id = c.agreement_id
    JOIN terms t ON t.id = ag.terms_id
    LEFT JOIN payments p ON p.contract_id = c.id
                        AND p.status = 'confirmed'
                        ${dateConditions}
    WHERE l.owner_id = $1
      ${extraFilters}
    GROUP BY c.id, c.listing_id, l.title, c.status, c.start_date, c.end_date, u.name, u.email, u.phone, t.rent
    ORDER BY total_rent_received DESC, c.id DESC
  `;

  const result = await pool.query(sql, queryParams);

  return result.rows.map((row: any) => ({
    contractId: row.contract_id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    contractStatus: row.contract_status,
    startDate: row.start_date,
    endDate: row.end_date,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    tenantPhone: row.tenant_phone,
    agreedMonthlyRent: parseFloat(row.agreed_monthly_rent || "0"),
    totalRentReceived: parseFloat(row.total_rent_received || "0"),
    confirmedPaymentsCount: parseInt(row.confirmed_payments_count || "0", 10),
    mostRecentPaymentDate: row.most_recent_payment_date || null,
  }));
}

/**
 * Returns a paginated list of individual confirmed rent payments for the authenticated owner.
 */
export async function getOwnerPaymentsLedger(
  ownerId: number,
  query: IncomeQueryParams,
  pagination: PaginationParams,
) {
  await ensureOwner(ownerId);
  await validateOwnerResourceAccess(ownerId, query.listing_id, query.contract_id);

  const { fromStr, toStr } = resolveDateRange(query);
  const queryParams: any[] = [ownerId];
  let dateConditions = "";
  let extraFilters = "";

  if (fromStr) {
    queryParams.push(fromStr);
    dateConditions += ` AND p.paid_at >= $${queryParams.length}::timestamp`;
  }
  if (toStr) {
    queryParams.push(toStr);
    dateConditions += ` AND p.paid_at <= $${queryParams.length}::timestamp`;
  }

  if (query.listing_id) {
    queryParams.push(query.listing_id);
    extraFilters += ` AND c.listing_id = $${queryParams.length}`;
  }

  if (query.contract_id) {
    queryParams.push(query.contract_id);
    extraFilters += ` AND c.id = $${queryParams.length}`;
  }

  // 1. Total count query for pagination
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM payments p
    JOIN contracts c ON c.id = p.contract_id
    JOIN listings l ON l.id = c.listing_id
    WHERE l.owner_id = $1
      AND p.status = 'confirmed'
      ${dateConditions}
      ${extraFilters}
  `;
  const countRes = await pool.query(countSql, queryParams);
  const total = countRes.rows[0]?.total || 0;

  // 2. Paginated rows query
  const limit = pagination.limit;
  const offset = (pagination.page - 1) * limit;

  queryParams.push(limit);
  const limitIdx = queryParams.length;
  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const sql = `
    SELECT
      p.id AS payment_id,
      p.contract_id,
      c.listing_id,
      l.title AS listing_title,
      u.name AS tenant_name,
      p.amount,
      p.payment_method,
      p.status,
      p.billing_month,
      p.due_date,
      p.paid_at,
      p.bkash_transaction_id,
      p.sslcommerz_transaction_id
    FROM payments p
    JOIN contracts c ON c.id = p.contract_id
    JOIN listings l ON l.id = c.listing_id
    JOIN users u ON u.id = c.tenant_id
    WHERE l.owner_id = $1
      AND p.status = 'confirmed'
      ${dateConditions}
      ${extraFilters}
    ORDER BY p.paid_at DESC NULLS LAST, p.id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const result = await pool.query(sql, queryParams);

  const payments = result.rows.map((row: any) => ({
    id: row.payment_id,
    contractId: row.contract_id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    tenantName: row.tenant_name,
    amount: parseFloat(row.amount || "0"),
    paymentMethod: row.payment_method,
    status: row.status,
    billingMonth: row.billing_month || null,
    dueDate: row.due_date || null,
    paidAt: row.paid_at || null,
    bKashTransactionId: row.bkash_transaction_id || null,
    sslCommerzTransactionId: row.sslcommerz_transaction_id || null,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    payments,
    pagination: {
      total,
      page: pagination.page,
      limit,
      totalPages,
    },
  };
}

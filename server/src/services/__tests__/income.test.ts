import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { incomeQuerySchema, paginationSchema } from "../../schemas/income.schema.js";
import {
  getOverallIncome,
  getListingIncome,
  getContractIncome,
  getOwnerPaymentsLedger,
} from "../income.service.js";
import { pool } from "../../db/pool.js";

describe("Rental Income Tracking Feature", () => {
  describe("1. Income Query Schema Validation", () => {
    test("accepts valid empty query parameters with defaults", () => {
      const parsed = incomeQuerySchema.safeParse({});
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.period, "all");
      }
    });

    test("accepts preset periods", () => {
      const periods = ["all", "this_month", "last_month", "last_3_months", "last_6_months", "custom"];
      for (const p of periods) {
        const parsed = incomeQuerySchema.safeParse({ period: p });
        assert.equal(parsed.success, true);
        if (parsed.success) {
          assert.equal(parsed.data.period, p);
        }
      }
    });

    test("rejects invalid period name", () => {
      const parsed = incomeQuerySchema.safeParse({ period: "yesterday" });
      assert.equal(parsed.success, false);
    });

    test("validates and accepts valid date formats for from and to", () => {
      const parsed = incomeQuerySchema.safeParse({
        period: "custom",
        from: "2026-01-01",
        to: "2026-03-31",
      });
      assert.equal(parsed.success, true);
    });

    test("rejects invalid date format", () => {
      const parsed = incomeQuerySchema.safeParse({
        from: "not-a-date",
      });
      assert.equal(parsed.success, false);
    });

    test("validates pagination schema with positive integers", () => {
      const parsed = paginationSchema.safeParse({ page: "2", limit: "20" });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.page, 2);
        assert.equal(parsed.data.limit, 20);
      }
    });

    test("clamps or falls back to defaults for invalid pagination values", () => {
      const parsed = paginationSchema.safeParse({ page: "-1", limit: "999" });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.page, 1);
        assert.equal(parsed.data.limit, 50); // capped at max 50
      }
    });
  });

  describe("2. Income Service Financial Calculations & Data Isolation", () => {
    // We mock pool.query to verify business logic and SQL generation
    let originalQuery: typeof pool.query;
    let queryCalls: Array<{ sql: string; params?: any[] }>;

    beforeEach(() => {
      queryCalls = [];
      originalQuery = pool.query;
    });

    function setMockQueryResult(handler: (sql: string, params?: any[]) => any) {
      pool.query = (async (sqlOrConfig: any, params?: any[]) => {
        const sql = typeof sqlOrConfig === "string" ? sqlOrConfig : sqlOrConfig.text;
        const callParams = typeof sqlOrConfig === "string" ? params : sqlOrConfig.values;
        queryCalls.push({ sql, params: callParams });
        return handler(sql, callParams);
      }) as any;
    }

    function restorePool() {
      pool.query = originalQuery;
    }

    test("getOverallIncome returns correct formatted calculations for owner with income", async () => {
      setMockQueryResult((sql, params) => {
        // Owner verification query
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        // Aggregation query
        return {
          rows: [
            {
              total_rent_received: "125000",
              current_month_rent_received: "25000",
              income_generating_contracts: 3,
              income_generating_listings: 2,
              active_contracts_count: 3,
              total_owned_listings: 4,
            },
          ],
        };
      });

      try {
        const result = await getOverallIncome(10, { period: "all" });
        assert.equal(result.currency, "BDT");
        assert.equal(result.totalRentReceived, 125000);
        assert.equal(result.currentMonthRentReceived, 25000);
        assert.equal(result.incomeGeneratingListings, 2);
        assert.equal(result.incomeGeneratingContracts, 3);
        assert.equal(result.activeContractsCount, 3);
        assert.equal(result.totalOwnedListings, 4);

        // Verify owner ID was passed
        assert.ok(queryCalls.some((c) => c.params && c.params[0] === 10));
      } finally {
        restorePool();
      }
    });

    test("getOverallIncome handles owner with no listings or zero income gracefully", async () => {
      setMockQueryResult((sql) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        return {
          rows: [
            {
              total_rent_received: "0",
              current_month_rent_received: "0",
              income_generating_contracts: 0,
              income_generating_listings: 0,
              active_contracts_count: 0,
              total_owned_listings: 0,
            },
          ],
        };
      });

      try {
        const result = await getOverallIncome(99, { period: "all" });
        assert.equal(result.totalRentReceived, 0);
        assert.equal(result.currentMonthRentReceived, 0);
        assert.equal(result.incomeGeneratingListings, 0);
        assert.equal(result.incomeGeneratingContracts, 0);
      } finally {
        restorePool();
      }
    });

    test("getOverallIncome applies date range filters to SQL query", async () => {
      setMockQueryResult((sql, params) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        return {
          rows: [
            {
              total_rent_received: "50000",
              current_month_rent_received: "0",
              income_generating_contracts: 1,
              income_generating_listings: 1,
              active_contracts_count: 1,
              total_owned_listings: 2,
            },
          ],
        };
      });

      try {
        await getOverallIncome(10, {
          period: "custom",
          from: "2026-01-01",
          to: "2026-06-30",
        });

        const aggQuery = queryCalls.find((c) => c.sql.includes("FROM listings l"));
        assert.ok(aggQuery, "Aggregation query must be executed");
        assert.ok(aggQuery.sql.includes("p.paid_at >="), "Query must include lower date boundary");
        assert.ok(aggQuery.sql.includes("p.paid_at <="), "Query must include upper date boundary");
        assert.ok(aggQuery.params?.includes("2026-01-01 00:00:00"));
      } finally {
        restorePool();
      }
    });

    test("getListingIncome returns per-listing breakdown including thumbnails", async () => {
      setMockQueryResult((sql) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("FROM listings l")) {
          return {
            rows: [
              {
                listing_id: 1,
                title: "Apartment 1A",
                listing_status: "occupied",
                area_name: "Gulshan",
                city: "Dhaka",
                advertised_rent: "40000",
                total_rent_received: "80000",
                contributing_contracts_count: 1,
                active_contracts_count: 1,
                most_recent_payment_date: new Date("2026-09-10T12:00:00Z"),
              },
              {
                listing_id: 2,
                title: "Apartment 2B",
                listing_status: "waiting",
                area_name: "Banani",
                city: "Dhaka",
                advertised_rent: "35000",
                total_rent_received: "0",
                contributing_contracts_count: 0,
                active_contracts_count: 0,
                most_recent_payment_date: null,
              },
            ],
          };
        }
        if (sql.includes("FROM listing_media lm")) {
          return {
            rows: [
              {
                listing_id: 1,
                id: 101,
                media_path: "listings/apt1.jpg",
                sort_order: 0,
              },
            ],
          };
        }
        return { rows: [] };
      });

      try {
        const listings = await getListingIncome(10, { period: "all" });
        assert.equal(listings.length, 2);
        assert.equal(listings[0].listingId, 1);
        assert.equal(listings[0].totalRentReceived, 80000);
        assert.equal(listings[0].contributingContractsCount, 1);
        assert.ok(listings[0].thumbnailUrl);

        // Zero-income listing is retained and presented with 0
        assert.equal(listings[1].listingId, 2);
        assert.equal(listings[1].totalRentReceived, 0);
        assert.equal(listings[1].contributingContractsCount, 0);
        assert.equal(listings[1].mostRecentPaymentDate, null);
      } finally {
        restorePool();
      }
    });

    test("getContractIncome isolates contracts and rejects unauthorized listing_id filter", async () => {
      setMockQueryResult((sql, params) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        // Ownership verification for listing_id
        if (sql.includes("SELECT 1 FROM listings WHERE id = $1 AND owner_id = $2")) {
          // Simulate listing 999 does NOT belong to owner 10
          return { rows: [] };
        }
        return { rows: [] };
      });

      try {
        await assert.rejects(
          () => getContractIncome(10, { period: "all", listing_id: 999 }),
          /you are not the owner of this listing/
        );
      } finally {
        restorePool();
      }
    });

    test("getContractIncome returns per-contract metrics with tenant details", async () => {
      setMockQueryResult((sql) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("FROM contracts c")) {
          return {
            rows: [
              {
                contract_id: 5,
                listing_id: 1,
                listing_title: "Apartment 1A",
                contract_status: "signed",
                start_date: "2026-08-01",
                end_date: "2027-07-31",
                tenant_name: "Rahim Tenant",
                tenant_email: "rahim@example.com",
                tenant_phone: "01711223344",
                agreed_monthly_rent: "40000",
                total_rent_received: "80000",
                confirmed_payments_count: 2,
                most_recent_payment_date: new Date("2026-09-10T12:00:00Z"),
              },
            ],
          };
        }
        return { rows: [] };
      });

      try {
        const contracts = await getContractIncome(10, { period: "all" });
        assert.equal(contracts.length, 1);
        assert.equal(contracts[0].contractId, 5);
        assert.equal(contracts[0].tenantName, "Rahim Tenant");
        assert.equal(contracts[0].agreedMonthlyRent, 40000);
        assert.equal(contracts[0].totalRentReceived, 80000);
        assert.equal(contracts[0].confirmedPaymentsCount, 2);
      } finally {
        restorePool();
      }
    });

    test("getOwnerPaymentsLedger returns paginated confirmed payments only", async () => {
      setMockQueryResult((sql) => {
        if (sql.includes("SELECT 1 FROM owners WHERE user_id")) {
          return { rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("COUNT(*)::int AS total")) {
          return { rows: [{ total: 1 }] };
        }
        if (sql.includes("FROM payments p")) {
          return {
            rows: [
              {
                payment_id: 42,
                contract_id: 5,
                listing_id: 1,
                listing_title: "Apartment 1A",
                tenant_name: "Rahim Tenant",
                amount: "40000",
                payment_method: "Cash",
                status: "confirmed",
                billing_month: "2026-09-01",
                due_date: "2026-09-05",
                paid_at: new Date("2026-09-10T12:00:00Z"),
                bkash_transaction_id: null,
                sslcommerz_transaction_id: null,
              },
            ],
          };
        }
        return { rows: [] };
      });

      try {
        const result = await getOwnerPaymentsLedger(
          10,
          { period: "all" },
          { page: 1, limit: 10 }
        );
        assert.equal(result.pagination.total, 1);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.totalPages, 1);
        assert.equal(result.payments.length, 1);
        assert.equal(result.payments[0].amount, 40000);
        assert.equal(result.payments[0].status, "confirmed");
        assert.equal(result.payments[0].paymentMethod, "Cash");

        // Verify only confirmed status is queried
        const pmtQuery = queryCalls.find((c) => c.sql.includes("FROM payments p"));
        assert.ok(pmtQuery?.sql.includes("p.status = 'confirmed'"));
      } finally {
        restorePool();
      }
    });
  });
});

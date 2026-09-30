import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../db/pool.js";
import { getListingTenantHistory } from "../listing.service.js";

describe("Feature: Tenant History per Listing", () => {
  let owner1Id: number;
  let owner2Id: number;
  let tenant1Id: number;
  let tenant2Id: number;
  let tenant3Id: number;
  let listing1Id: number;
  let listing2Id: number;

  before(async () => {
    // 1. Create area if needed
    const areaRes = await pool.query(
      `INSERT INTO areas (name, city, latitude, longitude, radius)
       VALUES ('Test Area TenantHist', 'Dhaka', 23.7, 90.4, 5)
       ON CONFLICT (name) DO UPDATE SET city = 'Dhaka'
       RETURNING id`
    );
    const areaId = areaRes.rows[0].id;

    // 2. Create Owners
    const o1 = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Owner One', 'owner1_th@example.com', 'NID_TH_O1', '01700000001', 'hash1')
       RETURNING id`
    );
    owner1Id = o1.rows[0].id;
    await pool.query(`INSERT INTO owners (user_id) VALUES ($1)`, [owner1Id]);

    const o2 = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Owner Two', 'owner2_th@example.com', 'NID_TH_O2', '01700000002', 'hash2')
       RETURNING id`
    );
    owner2Id = o2.rows[0].id;
    await pool.query(`INSERT INTO owners (user_id) VALUES ($1)`, [owner2Id]);

    // 3. Create Tenants
    const t1 = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Current Tenant', 'current_t@example.com', 'NID_TH_T1', '01800000001', 'hash_t1')
       RETURNING id`
    );
    tenant1Id = t1.rows[0].id;
    await pool.query(
      `INSERT INTO tenants (user_id, monthly_income, emergency_contact)
       VALUES ($1, 75000, '01900000001')`,
      [tenant1Id]
    );

    const t2 = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Past Tenant', 'past_t@example.com', 'NID_TH_T2', '01800000002', 'hash_t2')
       RETURNING id`
    );
    tenant2Id = t2.rows[0].id;
    await pool.query(
      `INSERT INTO tenants (user_id, monthly_income, emergency_contact)
       VALUES ($1, 60000, '01900000002')`,
      [tenant2Id]
    );

    const t3 = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Applicant Only', 'applicant_t@example.com', 'NID_TH_T3', '01800000003', 'hash_t3')
       RETURNING id`
    );
    tenant3Id = t3.rows[0].id;
    await pool.query(
      `INSERT INTO tenants (user_id, monthly_income, emergency_contact)
       VALUES ($1, 50000, '01900000003')`,
      [tenant3Id]
    );

    // 4. Create Listings
    const l1 = await pool.query(
      `INSERT INTO listings (title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status)
       VALUES ('Owner 1 Apartment', 'Great view', 23.7, 90.4, 2, 2, 4, $1, $2, 'occupied')
       RETURNING id`,
      [areaId, owner1Id]
    );
    listing1Id = l1.rows[0].id;

    const l2 = await pool.query(
      `INSERT INTO listings (title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status)
       VALUES ('Owner 2 Apartment', 'Nice place', 23.7, 90.4, 3, 2, 2, $1, $2, 'approved')
       RETURNING id`,
      [areaId, owner2Id]
    );
    listing2Id = l2.rows[0].id;

    // 5. Create Terms & Agreements for contracts
    const termsRes1 = await pool.query(
      `INSERT INTO terms (rent, security_deposit) VALUES (30000, 60000) RETURNING id`
    );
    const termsId1 = termsRes1.rows[0].id;
    await pool.query(`INSERT INTO agreements (terms_id) VALUES ($1)`, [termsId1]);

    const termsRes2 = await pool.query(
      `INSERT INTO terms (rent, security_deposit) VALUES (28000, 56000) RETURNING id`
    );
    const termsId2 = termsRes2.rows[0].id;
    await pool.query(`INSERT INTO agreements (terms_id) VALUES ($1)`, [termsId2]);

    const termsRes3 = await pool.query(
      `INSERT INTO terms (rent, security_deposit) VALUES (32000, 64000) RETURNING id`
    );
    const termsId3 = termsRes3.rows[0].id;
    await pool.query(`INSERT INTO agreements (terms_id) VALUES ($1)`, [termsId3]);

    // 6. Active / Current contract on listing1 (tenant1)
    await pool.query(
      `INSERT INTO contracts (listing_id, tenant_id, agreement_id, status, start_date, end_date)
       VALUES ($1, $2, $3, 'signed', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months')`,
      [listing1Id, tenant1Id, termsId1]
    );

    // 7. Completed / Past contract on listing1 (tenant2)
    await pool.query(
      `INSERT INTO contracts (listing_id, tenant_id, agreement_id, status, start_date, end_date)
       VALUES ($1, $2, $3, 'completed', CURRENT_DATE - INTERVAL '15 months', CURRENT_DATE - INTERVAL '3 months')`,
      [listing1Id, tenant2Id, termsId2]
    );

    // 8. Proposed (unsigned) contract on listing1 - should NOT appear in tenant history
    await pool.query(
      `INSERT INTO contracts (listing_id, tenant_id, agreement_id, status, start_date, end_date)
       VALUES ($1, $2, $3, 'proposed', CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '13 months')`,
      [listing1Id, tenant3Id, termsId3]
    );

    // 9. Applicant on listing1 (applies table only) - should NOT appear in tenant history
    await pool.query(
      `INSERT INTO applies (tenant_id, listing_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (tenant_id, listing_id) DO NOTHING`,
      [tenant3Id, listing1Id]
    );
  });

  after(async () => {
    try {
      await pool.query(`DELETE FROM contracts WHERE listing_id IN ($1, $2)`, [listing1Id, listing2Id]);
      await pool.query(`DELETE FROM applies WHERE listing_id IN ($1, $2)`, [listing1Id, listing2Id]);
      await pool.query(`DELETE FROM listings WHERE id IN ($1, $2)`, [listing1Id, listing2Id]);
      await pool.query(`DELETE FROM tenants WHERE user_id IN ($1, $2, $3)`, [tenant1Id, tenant2Id, tenant3Id]);
      await pool.query(`DELETE FROM owners WHERE user_id IN ($1, $2)`, [owner1Id, owner2Id]);
      await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)`, [
        owner1Id,
        owner2Id,
        tenant1Id,
        tenant2Id,
        tenant3Id,
      ]);
    } catch (e) {
      console.error("Cleanup error in tenant_history.test.ts:", e);
    }
  });

  describe("1. Ownership & Authorization", () => {
    test("Owner can successfully view tenant history for their own listing", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      assert.equal(history.listingId, listing1Id);
      assert.equal(history.listingTitle, "Owner 1 Apartment");
      assert.ok(Array.isArray(history.currentTenants));
      assert.ok(Array.isArray(history.pastTenants));
    });

    test("Non-owner is forbidden (403) from viewing another owner's listing tenant history", async () => {
      await assert.rejects(
        async () => {
          await getListingTenantHistory(owner2Id, listing1Id);
        },
        {
          statusCode: 403,
          message: "you are not authorized to view tenant history for this listing",
        }
      );
    });

    test("Requesting non-existent listing throws 404", async () => {
      await assert.rejects(
        async () => {
          await getListingTenantHistory(owner1Id, 999999);
        },
        {
          statusCode: 404,
          message: "listing not found",
        }
      );
    });
  });

  describe("2. Tenant Classification (Present vs Past)", () => {
    test("Active signed contract is correctly classified in currentTenants", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      assert.equal(history.currentTenants.length, 1);
      const current = history.currentTenants[0];
      assert.equal(current.tenantId, tenant1Id);
      assert.equal(current.name, "Current Tenant");
      assert.equal(current.contractStatus, "signed");
      assert.equal(current.monthlyRent, 30000);
      assert.ok(current.startDate);
      assert.ok(current.endDate);
    });

    test("Completed contract is correctly classified in pastTenants", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      assert.equal(history.pastTenants.length, 1);
      const past = history.pastTenants[0];
      assert.equal(past.tenantId, tenant2Id);
      assert.equal(past.name, "Past Tenant");
      assert.equal(past.contractStatus, "completed");
      assert.equal(past.monthlyRent, 28000);
      assert.ok(past.startDate);
      assert.ok(past.endDate);
    });

    test("Proposed (unsigned) contracts are EXCLUDED from tenant history", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      const allTenantIds = [
        ...history.currentTenants.map((t) => t.tenantId),
        ...history.pastTenants.map((t) => t.tenantId),
      ];
      assert.ok(!allTenantIds.includes(tenant3Id), "Unsigned contract must not appear as a tenant");
    });

    test("Applicants without signed contracts are NEVER classified as tenants", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      const applicantTenant = history.currentTenants.find((t) => t.tenantId === tenant3Id) ||
                              history.pastTenants.find((t) => t.tenantId === tenant3Id);
      assert.equal(applicantTenant, undefined);
    });

    test("Listing with no contracts returns empty arrays for both current and past", async () => {
      const history = await getListingTenantHistory(owner2Id, listing2Id);
      assert.equal(history.currentTenants.length, 0);
      assert.equal(history.pastTenants.length, 0);
    });
  });

  describe("3. Data Privacy & Confidentiality", () => {
    test("Sensitive fields (password_hash, nid, monthly_income) are NEVER exposed", async () => {
      const history = await getListingTenantHistory(owner1Id, listing1Id);
      const allTenants = [...history.currentTenants, ...history.pastTenants];

      for (const tenant of allTenants) {
        assert.equal((tenant as any).password_hash, undefined);
        assert.equal((tenant as any).password, undefined);
        assert.equal((tenant as any).nid, undefined);
        assert.equal((tenant as any).monthly_income, undefined);
        assert.equal((tenant as any).monthlyIncome, undefined);
        assert.equal((tenant as any).income, undefined);

        assert.ok(tenant.name);
        assert.ok(tenant.email);
        assert.ok(tenant.startDate);
        assert.ok(tenant.endDate);
        assert.ok(typeof tenant.monthlyRent === "number");
        assert.ok(tenant.contractStatus);
      }
    });
  });
});

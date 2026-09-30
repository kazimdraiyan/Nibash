import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../db/pool.js";
import {
  createReview,
  getReviewForContract,
  updateReview,
  deleteReview,
  getReviewsForListing,
} from "../review.service.js";

describe("Review Feature Service", () => {
  let ownerId: number;
  let tenantId: number;
  let otherUserId: number;
  let listingId: number;
  let termsId: number;
  let agreementId: number;
  let contractId: number;
  let paymentId: number;

  before(async () => {
    // 1. Create owner
    const ownerRes = await pool.query(
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Review Owner', 'review_owner@example.com', '8811223344', '01722223344', 'hash') RETURNING id"
    );
    ownerId = ownerRes.rows[0].id;
    await pool.query("INSERT INTO owners (user_id) VALUES ($1)", [ownerId]);

    // 2. Create tenant
    const tenantRes = await pool.query(
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Review Tenant', 'review_tenant@example.com', '8811223355', '01722223355', 'hash') RETURNING id"
    );
    tenantId = tenantRes.rows[0].id;
    await pool.query(
      "INSERT INTO tenants (user_id, monthly_income, emergency_contact) VALUES ($1, 60000, '01788887777')",
      [tenantId]
    );

    // 3. Create another user
    const otherRes = await pool.query(
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Other Reviewer', 'other_reviewer@example.com', '8811223366', '01722223366', 'hash') RETURNING id"
    );
    otherUserId = otherRes.rows[0].id;

    // 4. Area
    const areaRes = await pool.query("SELECT id FROM areas LIMIT 1");
    const areaId = areaRes.rows[0].id;

    // 5. Listing
    const listingRes = await pool.query(
      "INSERT INTO listings (title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status) VALUES ('Review Test Apt', 'Great place', 23.79, 90.41, 3, 2, 3, $1, $2, 'occupied') RETURNING id",
      [areaId, ownerId]
    );
    listingId = listingRes.rows[0].id;

    // 6. Terms & initial_terms
    const termsRes = await pool.query(
      "INSERT INTO terms (rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit) VALUES (30000, 2000, 1000, 3000, 5, true, 60000) RETURNING id"
    );
    termsId = termsRes.rows[0].id;
    await pool.query("INSERT INTO initial_terms (listing_id, terms_id) VALUES ($1, $2)", [
      listingId,
      termsId,
    ]);

    // 7. Agreement & Contract
    const agreementRes = await pool.query(
      "INSERT INTO agreements (terms_id) VALUES ($1) RETURNING terms_id",
      [termsId]
    );
    agreementId = agreementRes.rows[0].terms_id;

    const contractRes = await pool.query(
      "INSERT INTO contracts (listing_id, tenant_id, agreement_id, start_date, end_date, status) VALUES ($1, $2, $3, '2026-10-01', '2027-09-30', 'signed') RETURNING id",
      [listingId, tenantId, agreementId]
    );
    contractId = contractRes.rows[0].id;

    // 8. Pending payment (unconfirmed initially)
    const paymentRes = await pool.query(
      "INSERT INTO payments (contract_id, amount, status, billing_month, due_date) VALUES ($1, 36000, 'pending', '2026-10-01', '2026-10-05') RETURNING id",
      [contractId]
    );
    paymentId = paymentRes.rows[0].id;
  });

  after(async () => {
    try {
      await pool.query(
        "DELETE FROM review_media WHERE review_id IN (SELECT id FROM reviews WHERE contract_id = $1)",
        [contractId]
      );
      await pool.query("DELETE FROM reviews WHERE contract_id = $1", [contractId]);
      await pool.query("DELETE FROM payments WHERE contract_id = $1", [contractId]);
      await pool.query("DELETE FROM contracts WHERE id = $1", [contractId]);
      await pool.query("DELETE FROM agreements WHERE terms_id = $1", [agreementId]);
      await pool.query("DELETE FROM initial_terms WHERE listing_id = $1", [listingId]);
      await pool.query("DELETE FROM terms WHERE id = $1", [termsId]);
      await pool.query("DELETE FROM listings WHERE id = $1", [listingId]);
      await pool.query("DELETE FROM tenants WHERE user_id = $1", [tenantId]);
      await pool.query("DELETE FROM owners WHERE user_id = $1", [ownerId]);
      await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [
        ownerId,
        tenantId,
        otherUserId,
      ]);
    } catch (err) {
      console.error("Cleanup error in review.test.ts:", err);
    }
  });

  test("createReview throws error if contract has no confirmed payment", async () => {
    await assert.rejects(
      async () => {
        await createReview(tenantId, {
          contract_id: contractId,
          rating: 5,
          description: "Nice apartment",
        });
      },
      (err: any) => {
        return (
          err.message.includes("payment") ||
          err.message.includes("No confirmed payment")
        );
      }
    );
  });

  test("createReview creates a review with rating and optional description once payment is confirmed", async () => {
    // Confirm the payment
    await pool.query("UPDATE payments SET status = 'confirmed' WHERE id = $1", [paymentId]);

    const review = await createReview(tenantId, {
      contract_id: contractId,
      rating: 5,
      description: "Wonderful apartment, very quiet and clean.",
    });

    assert.ok(review.id);
    assert.equal(review.rating, 5);
    assert.equal(review.description, "Wonderful apartment, very quiet and clean.");
  });

  test("createReview prevents duplicate review on the same contract", async () => {
    await assert.rejects(
      async () => {
        await createReview(tenantId, {
          contract_id: contractId,
          rating: 4,
          description: "Trying to submit another review",
        });
      },
      (err: any) => {
        return err.message.includes("already exists");
      }
    );
  });

  test("getReviewForContract returns the review with media for the contract", async () => {
    const data = await getReviewForContract(contractId);
    assert.ok(data);
    assert.equal(data.rating, 5);
    assert.equal(data.description, "Wonderful apartment, very quiet and clean.");
    assert.ok(Array.isArray(data.media));
  });

  test("updateReview updates rating and description", async () => {
    const existing = await getReviewForContract(contractId);
    assert.ok(existing);

    const updated = await updateReview(tenantId, existing.id, {
      rating: 4,
      description: "Updated: Decent apartment, friendly neighbors.",
      keep_media_ids: undefined,
    });

    assert.equal(updated.rating, 4);
    assert.equal(updated.description, "Updated: Decent apartment, friendly neighbors.");
  });

  test("getReviewsForListing returns reviewer name and summary for the listing", async () => {
    const result = await getReviewsForListing(String(listingId));
    assert.ok(result.reviews);
    assert.equal(result.reviews.length, 1);
    assert.equal(result.reviews[0].reviewer_name, "Review Tenant");
    assert.equal(result.reviews[0].rating, 4);
    assert.ok(result.summary);
    assert.equal(result.summary.total_reviews, 1);
    assert.equal(result.summary.average_rating, 4);
  });

  test("deleteReview deletes the review", async () => {
    const existing = await getReviewForContract(contractId);
    assert.ok(existing);

    await deleteReview(tenantId, existing.id);

    const afterDelete = await getReviewForContract(contractId);
    assert.equal(afterDelete, null);
  });
});

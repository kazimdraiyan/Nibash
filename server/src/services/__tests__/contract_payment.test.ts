import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../db/pool.js";
import { getActiveContractForTenant, getContractById } from "../contract.service.js";
import { payByCash, rejectCash, getPaymentsForContract } from "../payment.service.js";
import { getMylistings } from "../listing.service.js";

describe("Contract & Payment Enhancements", () => {
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
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Contract Owner', 'contract_owner@example.com', '9900112233', '01711112233', 'hash') RETURNING id"
    );
    ownerId = ownerRes.rows[0].id;
    await pool.query("INSERT INTO owners (user_id) VALUES ($1)", [ownerId]);

    // 2. Create tenant
    const tenantRes = await pool.query(
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Contract Tenant', 'contract_tenant@example.com', '9900112244', '01711112244', 'hash') RETURNING id"
    );
    tenantId = tenantRes.rows[0].id;
    await pool.query(
      "INSERT INTO tenants (user_id, monthly_income, emergency_contact) VALUES ($1, 75000, '01799998888')",
      [tenantId]
    );

    // 3. Create another user
    const otherRes = await pool.query(
      "INSERT INTO users (name, email, nid, phone, password_hash) VALUES ('Other User', 'other_user@example.com', '9900112255', '01711112255', 'hash') RETURNING id"
    );
    otherUserId = otherRes.rows[0].id;

    // 4. Create area if needed or get first area
    const areaRes = await pool.query("SELECT id FROM areas LIMIT 1");
    const areaId = areaRes.rows[0].id;

    // 5. Create listing
    const listingRes = await pool.query(
      "INSERT INTO listings (title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status) VALUES ('Occupied Apt 4B', 'Lovely apartment', 23.7917, 90.4167, 2, 2, 4, $1, $2, 'occupied') RETURNING id",
      [areaId, ownerId]
    );
    listingId = listingRes.rows[0].id;

    // 6. Create terms & initial_terms
    const termsRes = await pool.query(
      "INSERT INTO terms (rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit) VALUES (35000, 2500, 1000, 4000, 5, true, 70000) RETURNING id"
    );
    termsId = termsRes.rows[0].id;
    await pool.query(
      "INSERT INTO initial_terms (listing_id, terms_id) VALUES ($1, $2)",
      [listingId, termsId]
    );

    // 7. Create agreement & contract
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

    // 8. Create a pending payment
    const paymentRes = await pool.query(
      "INSERT INTO payments (contract_id, amount, status, billing_month, due_date) VALUES ($1, 42500, 'pending', '2026-10-01', '2026-10-05') RETURNING id",
      [contractId]
    );
    paymentId = paymentRes.rows[0].id;
  });

  after(async () => {
    // Cleanup in reverse dependency order
    try {
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
      console.error("Cleanup error:", err);
    }
  });

  test("getActiveContractForTenant returns ongoing signed contract for tenant", async () => {
    const contract = await getActiveContractForTenant(tenantId);
    assert.ok(contract);
    assert.equal(contract.contract_id, contractId);

    const none = await getActiveContractForTenant(otherUserId);
    assert.equal(none, null);
  });

  test("getContractById returns enriched listing, tenant, and owner details", async () => {
    const details = await getContractById(String(contractId), tenantId);
    assert.ok(details);
    assert.equal(details.contract_id, contractId);
    assert.equal(details.listing_title, "Occupied Apt 4B");
    assert.equal(details.tenant_name, "Contract Tenant");
    assert.equal(details.tenant_email, "contract_tenant@example.com");
    assert.equal(details.tenant_phone, "01711112244");
    assert.equal(Number(details.monthly_income), 75000);
    assert.equal(details.emergency_contact, "01799998888");
    assert.equal(details.owner_name, "Contract Owner");
    assert.equal(details.owner_email, "contract_owner@example.com");
  });

  test("getMylistings includes ongoing_contract_id for occupied listings", async () => {
    const myListings = await getMylistings(ownerId);
    assert.ok(Array.isArray(myListings));
    const target = myListings.find((l: any) => l.id === listingId);
    assert.ok(target, "Listing should be present in owner listings");
    assert.equal(target.status, "occupied");
    assert.equal(target.ongoing_contract_id, contractId);
  });

  test("payByCash marks pending payment with Cash method keeping status pending", async () => {
    // 1. Other user cannot pay
    await assert.rejects(
      () => payByCash(otherUserId, String(paymentId)),
      /you are not the tenant of this contract/
    );

    // 2. Tenant marks payment as paid by cash
    await payByCash(tenantId, String(paymentId));

    // 3. Verify payment method is Cash and status remains pending
    const payments = await getPaymentsForContract(tenantId, String(contractId));
    assert.ok(payments.length > 0);
    const updatedPayment = payments.find((p: any) => p.id === paymentId);
    assert.ok(updatedPayment);
    assert.equal(updatedPayment.payment_method, "Cash");
    assert.equal(updatedPayment.status, "pending");

    // 4. Owner marks 'Didn't Receive' (rejectCash) -> method resets to null
    await rejectCash(ownerId, String(paymentId));
    const paymentsAfterReject = await getPaymentsForContract(tenantId, String(contractId));
    const rejectedPayment = paymentsAfterReject.find((p: any) => p.id === paymentId);
    assert.ok(rejectedPayment);
    assert.equal(rejectedPayment.payment_method, null);
    assert.equal(rejectedPayment.status, "pending");
  });
});

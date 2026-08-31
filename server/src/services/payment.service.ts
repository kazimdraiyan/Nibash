import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";
import { CreatePaymentInput } from "../schemas/payment.schema.js";

export async function createPayment(
  tenantId: number,
  data: CreatePaymentInput,
) {
  const {
    contract_id,
    amount,
    payment_method,
    bKash_transaction_id,
    SSLCommerz_transaction_id,
  } = data;

  const contract = await pool.query(
    "SELECT 1 FROM contracts WHERE id=$1 AND tenant_id=$2 AND status='signed'",
    [contract_id, tenantId],
  );
  if (contract.rows.length === 0)
    throw new AppError(403, "this contract doesnt exist");

  const rent = await pool.query(
    "SELECT t.rent FROM contracts c JOIN agreements a ON a.terms_id=c.agreement_id JOIN terms t ON t.id=a.terms_id WHERE c.id=$1",
    [contract_id],
  );
  if (amount !== parseFloat(rent.rows[0].rent))
    throw new AppError(400, "amount should be equal to rent");

  await pool.query(
    "INSERT INTO payments (contract_id,amount,payment_method,status,bKash_transaction_id,SSLCommerz_transaction_id) VALUES ($1,$2,$3,'pending',$4,$5)",
    [
      contract_id,
      amount,
      payment_method,
      bKash_transaction_id,
      SSLCommerz_transaction_id,
    ],
  );
}

export async function getPaymentsForContract(
  userId: number,
  contractId: string,
) {
  const owner = await pool.query(
    "SELECT 1 FROM contracts c JOIN listings l ON l.id=c.listing_id WHERE l.owner_id=$1 AND c.id=$2",
    [userId, contractId],
  );
  const tenant = await pool.query(
    "SELECT 1 FROM contracts WHERE tenant_id=$1 AND id=$2",
    [userId, contractId],
  );
  if (owner.rows.length === 0 && tenant.rows.length === 0) {
    throw new AppError(403, "you are not the owner or tenant of this contract");
  }
  const result = await pool.query(
    "SELECT * FROM payments WHERE contract_id=$1",
    [contractId],
  );
  return result.rows;
}

export async function resolvePayment(
  ownerId: number,
  paymentId: string,
  status: string,
) {
  const payment = await pool.query(
    `SELECT p.status AS payment_status, p.contract_id
         FROM payments p
         JOIN contracts c ON p.contract_id=c.id
         JOIN listings l ON l.id=c.listing_id
         WHERE l.owner_id=$1 AND p.id=$2`,
    [ownerId, paymentId],
  );
  if (payment.rows.length === 0)
    throw new AppError(403, "you are not the owner of this contract");
  if (payment.rows[0].payment_status !== "pending")
    throw new AppError(400, "payment is already resolved");

  const contract_id = payment.rows[0].contract_id;
  if (status === "confirmed") {
    await pool.query(
      "UPDATE payments SET status='confirmed', paid_at=NOW() WHERE id=$1",
      [paymentId],
    );
    await pool.query(
      "UPDATE contracts SET paid_security_deposit=true WHERE id=$1 AND paid_security_deposit=false",
      [contract_id],
    );
  } else {
    await pool.query("UPDATE payments SET status='failed' WHERE id=$1", [
      paymentId,
    ]);
  }
}

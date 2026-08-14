import { Router } from "express";
import { pool } from "../db/pool.js";
import { createPaymentSchema, updatePaymentSchema } from "../schemas/payment.schema.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.post("/", authMiddleware, async (req, res) => {   // tenant posts a payment
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const tenant_id = req.user.id;
        const result = createPaymentSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }
        const data = result.data;
        const { contract_id, amount, payment_method, bKash_transaction_id, SSLCommerz_transaction_id } = data;
        const status = 'pending';
        const contract = await pool.query("select * from contracts where id=$1 and tenant_id=$2 and status='signed'", [contract_id, tenant_id]);
        if (contract.rows.length === 0) {
            res.status(403).json({ error: "this contract doesnt exist" });
            return;
        }
        const rent = await pool.query(" select t.rent from contracts c join agreements a on a.id=c.agreement_id join terms t on t.id= a.terms_id where c.id=$1 ", [contract_id]);
        if (amount !== parseFloat(rent.rows[0].rent)) {
            res.status(400).json({ error: "amount should be equal to rent" });
            return;
        }
        await pool.query("insert into payments (contract_id,amount,payment_method,status,bKash_transaction_id,SSLCommerz_transaction_id) values($1,$2,$3,$4,$5,$6)", [contract_id, amount, payment_method, status, bKash_transaction_id, SSLCommerz_transaction_id]);
        res.json({ message: "payment posted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });

    }
});

router.get("/contracts/:contract_id", authMiddleware, async (req, res) => {          // tenant or owner sees all his payments
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const user_id = req.user.id;
        const contract_id = req.params.contract_id;
        const owner = await pool.query("select * from contracts c  join listings l on l.id=c.listing_id join owners o on o.user_id=l.owner_id where o.user_id=$1 and c.id=$2", [user_id, contract_id]);
        const tenant = await pool.query("select * from contracts c where c.tenant_id=$1 and c.id=$2", [user_id, contract_id]);
        if (owner.rows.length === 0 && tenant.rows.length === 0) {
            res.status(403).json({ error: "you are not the owner or tenant of this contract" });
            return;
        }
        const payments = await pool.query("select * from payments where contract_id=$1", [contract_id]);
        res.json({ payments: payments.rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});


router.patch("/:payment_id", authMiddleware, async (req, res) => {   // owner reviews a payment
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const user_id = req.user.id;
        const payment_id = req.params.payment_id;
        const isvalidOwner = await pool.query(
            `SELECT p.status AS payment_status, p.contract_id 
             FROM payments p 
             JOIN contracts c ON p.contract_id = c.id 
             JOIN listings l ON l.id = c.listing_id 
             WHERE l.owner_id = $1 AND p.id = $2`,
            [user_id, payment_id]
        );
        if (isvalidOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not the owner of this contract" });
            return;
        }
        if (isvalidOwner.rows[0].payment_status !== 'pending') {
            res.status(400).json({ error: "payment is already resolved" });
            return;
        }
        const result = updatePaymentSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }
        const data = result.data;
        const { status } = data;
        const contract_id = isvalidOwner.rows[0].contract_id;
        if (status === 'confirmed') {
            await pool.query("UPDATE payments SET status='confirmed', paid_at=NOW() WHERE id=$1", [payment_id]);
            await pool.query(
                "UPDATE contracts SET paid_security_deposit=true WHERE id=$1 AND paid_security_deposit=false",
                [contract_id]
            );
        } else {
            await pool.query("UPDATE payments SET status='failed' WHERE id=$1", [payment_id]);
        }
        res.json({ message: "payment updated successfully" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});







export default router;
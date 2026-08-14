import { Router } from "express";
import { pool } from "../db/pool.js";
import { createContractSchema, updateContractSchema } from "../schemas/contract.schema.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.post("/", authMiddleware, async (req, res) => {
    try {

        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const owner_id = req.user.id;
        const isOwner = await pool.query("select *  from owners where user_id =$1", [owner_id]);
        if (isOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not an owner" });
            return;
        }
        const result = createContractSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;

        }
        const data = result.data;
        const { listing_id, tenant_id, rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit, end_date, start_date } = data;
        const isValidlisting = await pool.query("select * from listings where id=$1 and owner_id=$2", [listing_id, owner_id]);
        if (isValidlisting.rows.length === 0) {
            res.status(403).json({ error: " this listing isnt yours" });
            return;
        }
        const validapplication = await pool.query(" select * from applies where tenant_id =$1 and listing_id =$2 and status= 'pending' ", [tenant_id, listing_id]);
        if (validapplication.rows.length === 0) {
            res.status(403).json({ error: " this application isnt pending" });
            return;
        }
        const notactivecontract = await pool.query("select * from contracts where listing_id =$1 and status in ('proposed','signed')", [listing_id]);
        if (notactivecontract.rows.length > 0) {
            res.status(403).json({ error: " there is already an active contract for this listing " });
            return;
        }
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const insertTerms = await client.query("insert into terms (rent,electricity_bill,water_bill,service_charge,monthly_due_date,pet_allowed,security_deposit) values ($1,$2,$3,$4,$5,$6,$7) returning id", [data.rent, data.electricity_bill, data.water_bill, data.service_charge, data.monthly_due_date, data.pet_allowed, data.security_deposit]);
            const termsId = insertTerms.rows[0].id;
            const insertAgreements = await client.query("insert into agreements (terms_id) values ($1) returning terms_id", [termsId]);
            const agreementId = insertAgreements.rows[0].terms_id;
            const insertContract = await client.query("insert into contracts (listing_id,tenant_id,agreement_id,start_date,end_date,status) values ($1,$2,$3,$4,$5,'proposed') returning id", [listing_id, tenant_id, agreementId, start_date, end_date]);
            const contractId = insertContract.rows[0].id;
            await client.query("update applies set status='approved' where tenant_id=$1 and listing_id=$2", [tenant_id, listing_id]);
            await client.query(
                "UPDATE applies SET status='rejected' WHERE listing_id=$1 AND tenant_id != $2 AND status='pending'",
                [listing_id, tenant_id]
            );
            await client.query("COMMIT");
            res.status(201).json({ message: " contract created successfully", contractId });
        } catch (err) {
            await client.query("ROLLBACK");
            console.log(err);
            res.status(500).json({ error: "something went wrong" });
        } finally {
            client.release();
        }

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });

    }
});



router.get("/:id", authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const user_id = req.user.id;
        const { id } = req.params;
        const contract = await pool.query("SELECT l.owner_id , c.tenant_id FROM contracts c JOIN listings l ON c.listing_id = l.id WHERE c.id=$1", [id]);
        if (contract.rows.length === 0) {
            res.status(404).json({ error: "contract not found" });
            return;
        }
        if (user_id === contract.rows[0].owner_id || user_id === contract.rows[0].tenant_id) {
            const getinfo = await pool.query(
                `SELECT c.id AS contract_id, c.tenant_id, c.listing_id, c.agreement_id, 
            c.status, c.start_date, c.end_date, c.paid_security_deposit,
            t.rent, t.electricity_bill, t.water_bill, t.service_charge, 
            t.monthly_due_date, t.pet_allowed, t.security_deposit
     FROM contracts c 
     JOIN agreements a ON a.terms_id = c.agreement_id 
     JOIN terms t ON t.id = a.terms_id 
     WHERE c.id = $1`,
                [id]
            );
            res.json(getinfo.rows[0]);
        }
        else {
            res.status(403).json({ error: "not authorized" });
            return;
        }





    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});



router.patch("/:id", authMiddleware, async (req, res) => {  // an applicant will sign the proposed contract
    try {                                                   // the contract will be completed by a cron job
        if(!req.user){
        res.status(401).json({error :"unauthorized"});
        return;
    }
    const user_id = req.user.id;
    const { id } = req.params;
    const contract = await pool.query("SELECT l.owner_id , c.tenant_id, c.status FROM contracts c JOIN listings l ON c.listing_id = l.id WHERE c.id=$1", [id]);
    if (contract.rows.length === 0) {
        res.status(404).json({ error: "contract not found" });
        return;
    }
    if(contract.rows[0].tenant_id !== user_id){
        res.status(403).json({ error: "not authorized" });
        return;
    }
    const prevstatus = contract.rows[0].status;
    if(prevstatus !== "proposed"){
        res.status(400).json({ error: "contract status cannot be updated" });
        return;
    }
    const result = updateContractSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error.issues[0].message });
        return;
    }
    const data = result.data;
    const { status } = data;
    await pool.query("update contracts set status=$1 where id=$2", [status, id]);
    res.json({ message: "contract status updated successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});






export default router;
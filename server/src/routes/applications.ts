import { Router } from "express";
import { pool } from "../db/pool.js";
import { applySchema, updateApplicationSchema } from "../schemas/application.schema.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {    // tenant applies for a listing
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }

        const tenantId = req.user.id;
        const isTenant = await pool.query("select * from tenants where user_id=$1", [tenantId]);
        if (isTenant.rows.length === 0) {
            res.status(403).json({ error: "youre not a tenant" });
            return;
        }

        const result = applySchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }

        const data = result.data; // use data instead of req.body from here on
        const { listingId } = data;
        const isValidlisting = await pool.query("select * from listings where id=$1 and status='approved'", [listingId]);
        if (isValidlisting.rows.length === 0) {
            res.status(400).json({ error: " listing doesnt exist" });
            return;
        }

        const existing = await pool.query(
            "SELECT 1 FROM applies WHERE tenant_id=$1 AND listing_id=$2",
            [tenantId, listingId]
        );
        if (existing.rows.length > 0) {
            res.status(409).json({ error: "already applied to this listing" });
            return;
        }

        await pool.query("insert into applies(tenant_id,listing_id) values($1,$2)", [tenantId, listingId]);
        res.json({ message: "applied successfully " });
    }

    catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

router.get("/", authMiddleware, async (req, res) => {                // an ownwer gets all the applications
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }

        const owner_id = req.user.id;
        const isOwner = await pool.query("select * from owners where user_id = $1", [owner_id]);
        if (isOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not an owner" });
            return;
        }

        const anylisting = await pool.query("select * from listings where owner_id =$1", [owner_id]);
        if (anylisting.rows.length === 0) {
            res.status(404).json({ error: "you dont have any listings" });
            return;
        }

        const allapplications = await pool.query("select * from applies a join listings l on a.listing_id=l.id where l.owner_id=$1", [owner_id]);
        res.json({ applications: allapplications.rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});




router.get("/:listingId", authMiddleware, async (req, res) => {                // an ownwer gets a specific application
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }

        const owner_id = req.user.id;
        const { listingId } = req.params;
        const isOwner = await pool.query("select * from owners where user_id = $1", [owner_id]);
        if (isOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not an owner" });
            return;
        }

        const listing = await pool.query("SELECT * FROM listings WHERE id = $1", [listingId]);
        if (listing.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }

        if (listing.rows[0].owner_id !== owner_id) {
            res.status(403).json({ error: "not authorized" });
            return;
        }

        const applications = await pool.query("select * from applies a join listings l on a.listing_id=l.id where l.owner_id=$1 and l.id=$2", [owner_id, listingId]);
        res.json({ applications: applications.rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

router.put("/:listingId/:tenantId", authMiddleware, async (req, res) => {    // owner  rejects applications
    try {
        const { listingId, tenantId } = req.params;
        const result = updateApplicationSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }

        const data = result.data; // use data instead of req.body from here on
        const { status } = data;

        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }

        const owner_id = req.user.id;
        const isOwner = await pool.query("select * from owners where user_id = $1", [owner_id]);
        if (isOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not an owner" });
            return;
        }

        const listing = await pool.query("SELECT * FROM listings WHERE id = $1", [listingId]);
        if (listing.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }

        if (listing.rows[0].owner_id !== owner_id) {
            res.status(403).json({ error: "not authorized" });
            return;
        }

        const applications = await pool.query("select * from applies a join listings l on a.listing_id=l.id where l.owner_id=$1 and l.id=$2 and a.tenant_id=$3", [owner_id, listingId, tenantId]);
        if (applications.rows.length === 0) {
            res.status(404).json({ error: "application not found" });
            return;
        }

        await pool.query("update applies set status =$1 where tenant_id =$2 and listing_id=$3", [status, tenantId, listingId]);

        res.json({ message: "application rejected by the owner" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

export default router;
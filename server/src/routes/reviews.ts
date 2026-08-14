import { Router } from "express";
import { pool } from "../db/pool.js";
import { createReviewSchema } from "../schemas/review.schema.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.post("/", authMiddleware, async (req, res) => {   //tenant posts a review
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const tenant_id = req.user.id;
        const result = createReviewSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }
        const data = result.data;
        const { contract_id, rating, description } = data;
        const contract = await pool.query("select * from contracts where id=$1 and tenant_id=$2 and status='completed'", [contract_id, tenant_id]);
        if (contract.rows.length === 0) {
            res.status(403).json({ error: "this contract doesnt exist or is not completed" });
            return;
        }
        const existingReview = await pool.query("select * from reviews where contract_id=$1", [contract_id]);
        if (existingReview.rows.length > 0) {
            res.status(400).json({ error: "review already exists for this contract" });
            return;
        }
        await pool.query("insert into reviews (contract_id,rating,description) values($1,$2,$3)", [contract_id, rating, description]);
        res.json({ message: "review posted successfully" });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

router.get("/listings/:listing_id", async (req, res) => {
    try {
        const listing_id = req.params.listing_id;
        const listing = await pool.query("SELECT 1 FROM listings WHERE id=$1", [listing_id]);
        if (listing.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }
        const reviews = await pool.query("select r.rating ,r.description,r.created_at,AVG(r.rating) over () as average_rating from reviews r join contracts c on c.id=r.contract_id where c.listing_id=$1 ", [listing_id]);
        res.json({ reviews: reviews.rows });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });

    }

});


export default router;
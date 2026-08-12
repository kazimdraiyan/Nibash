import { Router } from "express";
import { pool } from "../db/pool.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.get("/", async (req, res) => {           // visitors can see all the approved listing
    try {
        const findAllListings = await pool.query("select * from listings where status='approved'");
        res.json({ listings: findAllListings.rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});
router.post("/", authMiddleware, async (req, res) => {   // owner posts listings
    try {
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const owner_id = req.user.id;
        const isOwner = await pool.query("select * from owners where user_id =$1", [owner_id]);
        if (isOwner.rows.length === 0) {
            res.status(403).json({ error: "you are not an owner" });
            return;
        }

        const { title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit } = req.body;

        if (bedroom_count <= 0 || bathroom_count <= 0 || on_which_floor < 0) {  // cant be negative or zero
            res.status(400).json({ error: "bedroom_count, bathroom_count and on_which_floor must be non-negative" });
            return;
        }
        if (!title || !description) {
            res.status(400).json({ error: "title and description are required" });
            return;
        }
        const trimmedTitle = title.trim();  // checking if title and description are empty after trimming whitespace
        if (trimmedTitle.length === 0) {
            res.status(400).json({ error: "title cannot be empty" });
            return;
        }
        const trimmedDescription = description.trim();
        if (trimmedDescription.length === 0) {
            res.status(400).json({ error: "description cannot be empty" });
            return;
        }
        const area = await pool.query("select * from areas where id=$1", [area_id]);
        if (area.rows.length === 0) {     // chcking if the area_id exists in the areas table
            res.status(400).json({ error: "area_id does not exist" });
            return;
        }
        if (rent <= 0 || electricity_bill < 0 || water_bill < 0 || service_charge < 0 || security_deposit < 0) {  // rent cant be negative or zero, bills and security deposit cant be negative
            res.status(400).json({ error: "rent must be positive and bills and security deposit must be non-negative" });
            return;
        }
        if (monthly_due_date < 1 || monthly_due_date > 28) {  // monthly due date must be between 1 and 28
            res.status(400).json({ error: "monthly_due_date must be between 1 and 28" });
            return;
        }
        if (pet_allowed !== true && pet_allowed !== false) {  // pet_allowed must be boolean
            res.status(400).json({ error: "pet_allowed must be boolean" });
            return;
        }

        const status = "waiting";  // when owner posts a listing, it will be waiting for admin approval
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const insert = await client.query("insert into listings (title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id,owner_id,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id", [trimmedTitle, trimmedDescription, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status]);
            const listingId = insert.rows[0].id;
            const insertTerms = await client.query("insert into terms (rent,electricity_bill,water_bill,service_charge,monthly_due_date,pet_allowed,security_deposit) values ($1,$2,$3,$4,$5,$6,$7) returning id", [rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit]);
            const termsId = insertTerms.rows[0].id;
            await client.query("insert into initial_terms (listing_id,terms_id) values ($1,$2)", [listingId, termsId]);
            await client.query("COMMIT");
            res.status(201).json({ message: "listing created successfully" });


        }
        catch (err) {
            await client.query("ROLLBACK");
            console.log(err);
            res.status(500).json({ error: "something went wrong" });
        }
        finally {
            client.release();
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }

});

router.get("/:id", async (req, res) => {  // get a specific listing
    try {
        const { id } = req.params;
        const findListings = await pool.query("select * from listings where status='approved' and id=$1", [id]);
        if (findListings.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }
        res.json({ listings: findListings.rows[0] });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

router.patch("/:id", authMiddleware, async (req, res) => {      // owner updates a listing
    try {                                                    // cant set  null value for coalesce
        const { id } = req.params;
        const listing = await pool.query("SELECT * from listings where id= $1", [id]);
        if (listing.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        if (listing.rows[0].owner_id === req.user.id) {  //checking if the user is the owner of the listing

            const { title, description, bedroom_count, bathroom_count, on_which_floor, area_id, rent, electricity_bill, water_bill, service_charge, monthly_due_date, pet_allowed, security_deposit } = req.body;
            if (area_id !== undefined) {
                const isarea = await pool.query("select * from areas where id=$1", [area_id]);
                if (isarea.rows.length === 0) {
                    res.status(400).json({ error: "area_id does not exist" });
                    return;
                }
            }
            if (bedroom_count !== undefined && bedroom_count <= 0 || bathroom_count !== undefined && bathroom_count <= 0 || on_which_floor !== undefined && on_which_floor < 0) {  // cant be negative or zero
                res.status(400).json({ error: "values cannot be negative or zero" });
                return;
            }
            if (rent !== undefined && rent <= 0) {
                res.status(400).json({ error: "rent must be positive" });
                return;
            }
            if (electricity_bill !== undefined && electricity_bill < 0) {
                res.status(400).json({ error: "electricity_bill cannot be negative" });
                return;
            }
            if (water_bill !== undefined && water_bill < 0) {
                res.status(400).json({ error: "water_bill cannot be negative" });
                return;
            }
            if (service_charge !== undefined && service_charge < 0) {
                res.status(400).json({ error: "service_charge cannot be negative" });
                return;
            }
            if (security_deposit !== undefined && security_deposit < 0) {
                res.status(400).json({ error: "security_deposit cannot be negative" });
                return;
            }
            if (monthly_due_date !== undefined && (monthly_due_date < 1 || monthly_due_date > 28)) {
                res.status(400).json({ error: "monthly_due_date must be between 1 and 28" });
                return;
            }
            if (pet_allowed !== undefined && pet_allowed !== true && pet_allowed !== false) {
                res.status(400).json({ error: "pet_allowed must be a boolean" });
                return;
            }
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                const updateListing = await client.query(
                    "UPDATE listings SET title = COALESCE($1, title), description = COALESCE($2, description), bedroom_count = COALESCE($3, bedroom_count), bathroom_count = COALESCE($4, bathroom_count), on_which_floor = COALESCE($5, on_which_floor), area_id = COALESCE($6, area_id) WHERE id = $7",
                    [title ?? null, description ?? null, bedroom_count ?? null, bathroom_count ?? null, on_which_floor ?? null, area_id ?? null, id]
                );
                const updateTerms = await client.query(
                    "UPDATE terms SET rent = COALESCE($1, rent), electricity_bill = COALESCE($2, electricity_bill), water_bill = COALESCE($3, water_bill), service_charge = COALESCE($4, service_charge), monthly_due_date = COALESCE($5, monthly_due_date), pet_allowed = COALESCE($6, pet_allowed), security_deposit = COALESCE($7, security_deposit) WHERE id = (SELECT terms_id FROM initial_terms WHERE listing_id = $8)",
                    [rent ?? null, electricity_bill ?? null, water_bill ?? null, service_charge ?? null, monthly_due_date ?? null, pet_allowed ?? null, security_deposit ?? null, id]
                );

                await client.query("COMMIT");
                res.json({ message: "listing updated successfully" });

            } catch (err) {
                await client.query("ROLLBACK");
                console.error(err);
                res.status(500).json({ error: "something went wrong" });
            }
            finally {
                client.release();
            }
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


router.delete("/:id", authMiddleware, async (req, res) => {      // owner deletes a listing
    try {
        const { id } = req.params;
        const listing = await pool.query("SELECT * from listings where id= $1", [id]);
        if (listing.rows.length === 0) {
            res.status(404).json({ error: "listing not found" });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        if (listing.rows[0].owner_id === req.user.id) {

            const result = await pool.query("UPDATE listings set status='unavailable' where id=$1", [id]);
            res.json({ message: "deleted successfully" });
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




export default router;
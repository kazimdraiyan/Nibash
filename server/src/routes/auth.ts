import { Router } from "express";
import { pool } from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }

        const data = result.data; // use data instead of req.body from here on
        const { name, email, password, phone, nid, role, monthly_income, emergency_contact } = data;
        if (role === "tenant" || role === "both") {
            if (!monthly_income || !emergency_contact) {
                res.status(400).json({ error: "monthly_income and emergency_contact are required for tenants" });
                return;
            }
        }

        const client = await pool.connect();   // single connection to the database, we will use this client to run queries
        try {
            await client.query("BEGIN");  // starting a transaction
            const existingUser = await client.query("SELECT * FROM users WHERE email=$1 or nid=$2 or phone=$3", [email, nid, phone]);
            if (existingUser.rows.length > 0) {
                await client.query("ROLLBACK");  // rolling back the transaction if email already exists
                res.status(400).json({ error: "email or NID or phone already exists" });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);  // hashing the password before storing it in the database
            const insertUser = await client.query("INSERT INTO users (name,email,password_hash,phone,nid) VALUES ($1,$2,$3,$4,$5) RETURNING id", [name, email, hashedPassword, phone, nid]);
            const userId = insertUser.rows[0].id;

            if (role === "owner" || role === "both") {
                await client.query("INSERT INTO owners (user_id) VALUES ($1)", [userId]);
            }
            if (role === "tenant" || role === "both") {
                await client.query("INSERT INTO tenants (user_id,monthly_income,emergency_contact) VALUES ($1,$2,$3)", [userId, monthly_income, emergency_contact]);
            }
            if (role === "verifier") {
                await client.query("INSERT INTO verifiers (user_id) VALUES ($1)", [userId]);
            }
            await client.query("COMMIT");  // committing the transaction
            res.json({ message: "user registered successfully" });
        }
        catch (err) {
            await client.query("ROLLBACK");  // rolling back the transaction if any error occurs
            console.log(err);
            res.status(500).json({ error: "something went wrong" });
        } finally {
            client.release();  // releasing the client back to the pool
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: result.error.issues[0].message });
            return;
        }

        const data = result.data; // use data instead of req.body from here on
        const { email, password } = data;
        const find = await pool.query("SELECT id,email,password_hash from users where email =$1", [email]);
        if (find.rows.length === 0) {  // a sql query always returns something truthy
            res.status(401).json({ error: "wrong credentials" }); // not authenticated error
            return;

        }

        const correctPassword = await bcrypt.compare(password, find.rows[0].password_hash);
        if (!correctPassword) {
            res.status(401).json({ error: "wrong credentials" });
            return;
        }

        const token = jwt.sign(
            { id: find.rows[0].id, email: find.rows[0].email },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );
        res.json({ token });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "something went wrong" });
    }
});

export default router;
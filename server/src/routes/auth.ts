import {Router } from "express";
import {pool} from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = Router();

router.post("/register", async (req,res)=>{
    
        const {name,email,password,phone,nid,role} = req.body;
        if(!name || !email || !password|| !phone || !nid || !role)  {
        res.status(400).json({error: "please fill out every information"});// 400-> bad request, client side fault
        return;
    } 
       if(nid.length !== 10 && nid.length !== 13 && nid.length !== 17){ // validating NID 
            res.status(400).json({error: "Invalid NID length"});
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;    // validating email format using regex
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: "Invalid email format" });
            return;
        }
        if(phone.length !== 11 || !phone.startsWith("01")){      // phone number validation
            res.status(400).json({error: "Invalid phone number"});
            return;
        }
        const validRoles = ["owner", "tenant","verifier","both"];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: "Invalid role" });
            return;
        }
        const ifTenant = role === "tenant" || role === "both";
        const {monthly_income,emergency_contact} = req.body;
        if(ifTenant){
            if(monthly_income=== undefined ||monthly_income === null || !emergency_contact){
                res.status(400).json({error: "please fill out every information for tenant"});
                return;
            }
            if(monthly_income <= 0) {
                res.status(400).json({ error: "monthly_income must be a positive number" });
                return;
            }
        }
        const client = await pool.connect();   // single connection to the database, we will use this client to run queries
        try{
            await client.query("BEGIN");  // starting a transaction
            const existingUser = await client.query("SELECT * FROM users WHERE email=$1 or nid=$2 or phone=$3",[email,nid,phone]);
            if(existingUser.rows.length>0){
                await client.query("ROLLBACK");  // rolling back the transaction if email already exists
                res.status(400).json({error: "email or NID or phone already exists"});
                return;
            }
            const hashedPassword = await bcrypt.hash(password, 10);  // hashing the password before storing it in the database
            const insertUser = await client.query("INSERT INTO users (name,email,password_hash,phone,nid,role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",[name,email,hashedPassword,phone,nid,role]);
            const userId = insertUser.rows[0].id;
            
            if(role === "owner" || role === "both"){
             await client.query("INSERT INTO owners (user_id) VALUES ($1)",[userId]);
            }
            if(ifTenant){
             await client.query("INSERT INTO tenants (user_id,monthly_income,emergency_contact) VALUES ($1,$2,$3)",[userId,monthly_income,emergency_contact]);
            }
            if(role === "verifier"){
                await client.query("INSERT INTO verifiers (user_id) VALUES ($1)",[userId]);
            }
            await client.query("COMMIT");  // committing the transaction
            res.json({message: "user registered successfully"});
        }
        catch (err) {
            await client.query("ROLLBACK");  // rolling back the transaction if any error occurs
            console.log(err);
            res.status(500).json({ error: "something went wrong" });
        } finally {
            client.release();  // releasing the client back to the pool
        }
});
router.post("/login",async (req,res)=>{
    try {
        const{email,password}=req.body;
        const find = await pool.query("SELECT id,email,password_hash from users where email =$1",[email]);
        if(find.rows.length == 0){  // a sql query always returns something truthy
            res.status(401).json({error: "account doesnt exist"}); // not authenticated error
            return;
            
        }
        const correctPassword = await bcrypt.compare(password,find.rows[0].password_hash);
        if(!correctPassword){
           res.status(401).json({error: "wrong password"}); 
           return;
        }
        const token = jwt.sign(
            {id :find.rows[0].id, email: find.rows[0].email},
            process.env.JWT_SECRET as string,
            { expiresIn : "7d"}
        );
        res.json({token});
    } catch (err) {
    console.log(err);
            res.status(500).json({ error: "something went wrong" });
        } 
});
export default router;

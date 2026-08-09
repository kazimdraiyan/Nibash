import {Router } from "express";
import {pool} from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = Router();

router.post("/register", async (req,res)=>{
    try {
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
       const existingUser = await pool.query("SELECT * FROM users WHERE email=$1 or nid=$2 or phone=$3",[email,nid,phone]);
        if(existingUser.rows.length > 0){
            res.status(400).json({error: "An account with this email, NID, or phone number already exists"});
            return;     // two users cannot have the same email, NID or phone number
        }
        

        const hashedPassword = await bcrypt.hash(password, 10); 
        const insert = await pool.query("INSERT into users (name,email,password_hash,phone,nid) values($1,$2,$3,$4,$5) RETURNING id",[name,email,hashedPassword,phone,nid]);
        const userId = insert.rows[0].id;
        if(role == 'owner'){
            const ownerInsert = await pool.query("INSERT into owners(user_id) values($1)",[userId]);
        }
        else if(role == 'tenant'){
            const {monthly_income,emergency_contact}=req.body;
            const tenantInsert = await pool.query("INSERT into tenants(user_id,monthly_income,emergency_contact) values($1,$2,$3)",[userId,monthly_income,emergency_contact]);
        }
        else if(role == 'verifier'){
            const verifierInsert = await pool.query("INSERT into verifiers(user_id) values($1)",[userId]);
        }
        else{   // both owner and tenant
            const ownerInsert = await pool.query("INSERT into owners(user_id) values($1)",[userId]);
            const {monthly_income,emergency_contact}=req.body;
            const tenantInsert = await pool.query("INSERT into tenants(user_id,monthly_income,emergency_contact) values($1,$2,$3)",[userId,monthly_income,emergency_contact]);
        }
        res.json({ message: "registered succesfully" });
    } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
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

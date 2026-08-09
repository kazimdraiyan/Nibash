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
        else{
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

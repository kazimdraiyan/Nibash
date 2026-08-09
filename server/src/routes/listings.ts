import { Router } from "express";
import {pool} from "../db/pool.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.get("/", async (req,res)=>{
      try {
        const findAllListings= await pool.query("select * from listings where status='approved'");
      res.json({ listings: findAllListings.rows });
      } catch (err) {
         res.status(500).json({error: "something went wrong"});
      }
});
router.post("/",authMiddleware, async (req,res) => {
    try {
        const {title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id} = req.body;
        const owner_id= (req as any).user.id;
        const status = "waiting";
        const insert = await pool.query("insert into listings (title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id,owner_id,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status]);
        res.json({message: "Listing inserted"});        
    } catch (err) {
         res.status(500).json({error: "something went wrong"}); 
    }
    
});




export default router;
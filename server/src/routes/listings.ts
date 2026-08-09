import { Router } from "express";
import {pool} from "../db/pool.js";
const router = Router();
import authMiddleware from "../middleware/auth.js";

router.get("/", async (req,res)=>{           // visitors can see all the approved listing
      try {
        const findAllListings= await pool.query("select * from listings where status='approved'");
      res.json({ listings: findAllListings.rows });
      } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
}
});
router.post("/",authMiddleware, async (req,res) => {   // owner posts listings
    try {
        const {title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id} = req.body;
        const owner_id= (req as any).user.id;
        const status = "waiting";
        const insert = await pool.query("insert into listings (title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id,owner_id,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[title, description, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status]);
        res.json({message: "Listing inserted"});        
    } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
}
    
});

router.get("/:id", async (req,res)=>{  // get a specific listing
      try {
        const {id}=req.params;
        const findListings= await pool.query("select * from listings where status='approved' and id=$1",[id]);
        if(findListings.rows.length === 0){
            res.status(404).json({ error: "listing not found" });
            return;
}
      res.json({ listings: findListings.rows[0] });
      } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
}
});

router.put("/:id",authMiddleware, async (req,res)=>{      // owner updates a listing
    try {
        const {id}=req.params;
        const listing = await pool.query("SELECT * from listings where id= $1",[id]);
        if(listing.rows.length==0){
            res.status(404).json({error: "listing not found"});  
            return;
        }
        if(listing.rows[0].owner_id==(req as any).user.id){
          const { title, description, bedroom_count, bathroom_count, on_which_floor, area_id } = req.body;
          const update = await pool.query("UPDATE listings set title=$1,description=$2, bedroom_count=$3 , bathroom_count=$4, on_which_floor=$5,area_id=$6 where id =$7",[title, description, bedroom_count, bathroom_count, on_which_floor, area_id,id]);
          res.json({message: "updated successfully"});
        }
        else{
            res.status(403).json({ error: "not authorized" });
            return;
        }

    } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
}

});


router.delete("/:id",authMiddleware, async (req,res)=>{      // owner deletes a listing
    try {
        const {id}=req.params;
        const listing = await pool.query("SELECT * from listings where id= $1",[id]);
        if(listing.rows.length==0){
            res.status(404).json({error: "listing not found"});  
            return;
        }
        if(listing.rows[0].owner_id==(req as any).user.id){
          
          const result= await pool.query("UPDATE listings set status='unavailable' where id=$1",[id]);
          res.json({message: "deleted successfully"});
        }
        else{
            res.status(403).json({ error: "not authorized" });
            return;
        }

    } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong" });
}

});




export default router;
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
        if(!req.user){
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        const owner_id= req.user.id;
        const isOwner = await pool.query("select * from owners where user_id =$1",[owner_id]);
        if(isOwner.rows.length===0){
            res.status(403).json({error :"you are not an owner"});
            return;
        }

        const {title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id} = req.body;
        if(bedroom_count<=0 || bathroom_count<=0 || on_which_floor<0){  // cant be negative or zero
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
        const area = await pool.query("select * from areas where id=$1",[area_id]);
        if(area.rows.length===0){     // chcking if the area_id exists in the areas table
            res.status(400).json({ error: "area_id does not exist" });
            return;
        }

        
        const status = "waiting";
        const insert = await pool.query("insert into listings (title,description,latitude,longitude,bedroom_count, bathroom_count, on_which_floor, area_id,owner_id,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[trimmedTitle, trimmedDescription, latitude, longitude, bedroom_count, bathroom_count, on_which_floor, area_id, owner_id, status]);
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
        if(listing.rows.length===0){
            res.status(404).json({error: "listing not found"});  
            return;
        }
        if(!req.user){
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        if(listing.rows[0].owner_id===req.user.id){  //checking if the user is the owner of the listing
          // here frontend will send updated values and current values if not updated.
          //  So we can just update all the values with the new values.
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
        if(listing.rows.length===0){
            res.status(404).json({error: "listing not found"});  
            return;
        }
        if(!req.user){
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        if(listing.rows[0].owner_id===req.user.id){
          
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
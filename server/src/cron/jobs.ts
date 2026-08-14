import cron from "node-cron";
import { pool } from "../db/pool.js";

cron.schedule("0 0 * * *", async () => { // runs every day at midnight
    try {
        const result = await pool.query(
            "UPDATE contracts SET status='completed' WHERE end_date < NOW() AND status='signed' RETURNING id"
        );    // TODO: send email notification to tenant and owner for each completed contract
        console.log(`Updated ${result.rowCount} contracts to completed`);
    } catch (err) {
        console.log(err);

    }
}); 
export default {};
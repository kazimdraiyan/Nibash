import cron from "node-cron";
import { pool } from "../db/pool.js";
// schedule functions to run automatically at specific times
// cron time format is minute hour day_of_month month day_of_week
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
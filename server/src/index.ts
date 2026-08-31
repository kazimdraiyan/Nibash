import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './cron/jobs.js';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.route.js';
import listingRoutes from './routes/listing.route.js';
import applicationRoutes from './routes/application.route.js';
import contractRoutes from './routes/contract.route.js';
import paymentRoutes from './routes/payment.route.js';
import reviewRoutes from './routes/review.route.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/health", async (_req, res) => {  // health check
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ status: "ok", db_time: result.rows[0].now });
    } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        res.status(500).json({ status: "db error", error: message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

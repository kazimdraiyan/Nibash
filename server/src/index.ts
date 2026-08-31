import express from 'express';
import cors from 'cors';   // middleware to enable Cross-Origin Resource Sharing (CORS) for handling requests from different origins
// without it browsers block request from different ports
import dotenv from 'dotenv'; // loads the environment files
import './cron/jobs.js'; // runs the cron job
import { pool } from './db/pool.js'; // opening db connections are costly, so we use a connection pool to manage them efficiently
import authRoutes from './routes/auth.route.js';

// routes
import listingRoutes from './routes/listing.route.js';
import applicationRoutes from './routes/application.route.js';
import contractRoutes from './routes/contract.route.js';
import paymentRoutes from './routes/payment.route.js';
import reviewRoutes from './routes/review.route.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());  // middleware that parses incoming JSON request bodies into req.body. Without 
// this req.body is undefined

// route mounting 
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

// health chcek
app.get('/health', async (_req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', db_time: result.rows[0].now });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        res.status(500).json({ status: 'db error', error: message });
    }
});

// starts the actual http server, listening on port .env declares(5000 for fallback)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

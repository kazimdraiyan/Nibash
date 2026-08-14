import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool.js"; // keep .js if using NodeNext, drop it if using commonjs/node
import authRoutes from "./routes/auth.js";
import listingsRoutes from "./routes/listings.js";
import applicationRoutes from "./routes/applications.js";
import contractRoutes from "./routes/contracts.js";
import paymentRoutes from "./routes/payments.js";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/listings",listingsRoutes);
app.use("/api/applications",applicationRoutes);
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

// app.get("/api/protected", authMiddleware, async (req, res) => {    // testing purpose
//     res.json({ message: "you are authenticated", user: (req as any).user });
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
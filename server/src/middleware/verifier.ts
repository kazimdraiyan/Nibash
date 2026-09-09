import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool.js";

export async function requireVerifier(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = await pool.query("SELECT 1 FROM verifiers WHERE user_id=$1", [req.user.id]);
  if (result.rows.length === 0) {
    res.status(403).json({ error: "not a verifier" });
    return;
  }
  next();
}
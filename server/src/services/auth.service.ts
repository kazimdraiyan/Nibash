import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";

export async function getUserById(userId: number): Promise<{ id: number; name: string; email: string; nid: string; phone: string }> {
  const find = await pool.query(
    "SELECT id,name,email,nid,phone FROM users WHERE id=$1",
    [userId],
  );
  if (find.rows.length === 0) throw new AppError(404, "user not found");
  return find.rows[0];
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  phone: string,
  nid: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT 1 FROM users WHERE email=$1 OR nid=$2 OR phone=$3",
      [email, nid, phone],
    );
    if (existing.rows.length > 0)
      throw new AppError(400, "email or NID or phone already exists");
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query(
      "INSERT INTO users (name,email,password_hash,phone,nid) VALUES ($1,$2,$3,$4,$5)",
      [name, email, hashedPassword, phone, nid],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<string> {
  const find = await pool.query(
    "SELECT id,email,password_hash FROM users WHERE email=$1",
    [email],
  );
  if (find.rows.length === 0) throw new AppError(401, "wrong credentials");
  const correct = await bcrypt.compare(password, find.rows[0].password_hash);
  if (!correct) throw new AppError(401, "wrong credentials");
  return jwt.sign(
    { id: find.rows[0].id, email: find.rows[0].email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" },
  );
}

export async function becomeOwner(userId: number): Promise<void> {
  const existing = await pool.query("SELECT 1 FROM owners WHERE user_id=$1", [
    userId,
  ]);
  if (existing.rows.length > 0) return;
  await pool.query("INSERT INTO owners (user_id) VALUES ($1)", [userId]);
}

export async function becomeTenant(
  userId: number,
  monthly_income: number,
  emergency_contact: string,
): Promise<void> {
  const existing = await pool.query("SELECT 1 FROM tenants WHERE user_id=$1", [
    userId,
  ]);
  if (existing.rows.length > 0) return;
  await pool.query(
    "INSERT INTO tenants (user_id,monthly_income,emergency_contact) VALUES ($1,$2,$3)",
    [userId, monthly_income, emergency_contact],
  );
}

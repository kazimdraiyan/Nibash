import { pool } from "../db/pool.js";
import { AppError } from "../errors/AppError.js";

export async function ensureOwner(user_id: number): Promise<void> {
  const ifOwner = await pool.query("SELECT 1 FROM owners WHERE user_id=$1", [
    user_id,
  ]);
  if (ifOwner.rows.length === 0) {
    await pool.query("INSERT INTO owners (user_id) VALUES ($1)", [user_id]);
  }
}

export async function ensureTenant(
  user_id: number,
  monthly_income?: number,
  emergency_contact?: string,
): Promise<void> {
  const ifTenant = await pool.query("SELECT 1 FROM tenants WHERE user_id=$1", [
    user_id,
  ]);
  if (ifTenant.rows.length === 0) {
    if (!monthly_income || !emergency_contact)
      throw new AppError(403, "tenant_profile_required");
    await pool.query(
      "INSERT INTO tenants (user_id,monthly_income,emergency_contact) VALUES ($1,$2,$3)",
      [user_id, monthly_income, emergency_contact],
    );
  }
}

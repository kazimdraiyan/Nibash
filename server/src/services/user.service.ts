import { pool } from "../db/pool.js";
export async function ensureOwner(user_id:number): Promise<void> {
    const ifOwner = await pool.query("select * from owners where user_id = $1", [user_id]);
    if (ifOwner.rowCount === 0) {
        await pool.query("insert into owners (user_id) values ($1)", [user_id]);

    }
    return;
}
export async function ensureTenant(user_id:number,monthly_income?:number,emergency_contact?:string): Promise<void> {
    const ifTenant = await pool.query("select * from tenants where user_id = $1", [user_id]);
    if (ifTenant.rowCount === 0) {
        if (!monthly_income || !emergency_contact) {
        throw new Error("tenant_profile_required");
    }
        await pool.query("insert into tenants (user_id, monthly_income, emergency_contact) values ($1, $2, $3)", [user_id, monthly_income, emergency_contact]);
    }
    return;
}
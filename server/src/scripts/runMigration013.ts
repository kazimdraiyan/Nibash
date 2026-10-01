import fs from "node:fs";
import path from "node:path";
import { pool } from "../db/pool.js";

async function run() {
  const migrationPath = path.resolve(process.cwd(), "../db/migrations/013_search_infrastructure.sql");
  console.log(`Reading migration from: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, "utf-8");

  const client = await pool.connect();
  try {
    console.log("Applying migration 013...");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration 013 applied successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to apply migration 013:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

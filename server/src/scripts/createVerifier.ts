// Run with: npx tsx src/scripts/createVerifier.ts

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

const rl = readline.createInterface({ input: stdin, output: stdout });

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  console.log("Create Verifier Account\n");

  const name = await prompt("Name: ");
  const email = await prompt("Email: ");
  const phone = await prompt("Phone: ");
  const nid = await prompt("NID: ");
  const password = await prompt("Password: ");

  rl.close();

  if (!name || !email || !phone || !nid || !password) {
    console.error("\nAll fields are required. Aborting.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT 1 FROM users WHERE email=$1 OR nid=$2 OR phone=$3",
      [email, nid, phone]
    );
    if (existing.rows.length > 0) {
      throw new Error("A user with this email, NID, or phone already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await client.query(
      "INSERT INTO users (name,email,password_hash,phone,nid) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [name, email, hashedPassword, phone, nid]
    );
    const userId = inserted.rows[0].id;

    await client.query("INSERT INTO verifiers (user_id) VALUES ($1)", [userId]);

    await client.query("COMMIT");

    console.log(`\nVerifier created successfully.`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Email:   ${email}`);
    console.log(`   Password: ${password} (share this with the employee — it's not stored anywhere in plaintext)`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`\nFailed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
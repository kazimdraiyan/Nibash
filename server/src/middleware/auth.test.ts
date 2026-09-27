import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { getOptionalUser } from "./auth.js";

process.env.JWT_SECRET = "test-secret";

test("does not treat a revoked optional token as an authenticated user", async () => {
  const token = jwt.sign({ id: 99, email: "tenant@example.com" }, "test-secret");

  const user = await getOptionalUser(token, async () => true);

  assert.equal(user, undefined);
});

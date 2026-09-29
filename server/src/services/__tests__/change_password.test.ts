import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { pool } from "../../db/pool.js";
import { AppError } from "../../errors/AppError.js";
import { changePasswordSchema } from "../../schemas/auth.schema.js";
import { changePassword } from "../auth.service.js";
import { changePassword as changePasswordController } from "../../controllers/auth.controller.js";
import type { Request, Response } from "express";


describe("Change Password Feature", () => {
  let testUserId: number;
  const initialPassword = "OldSecurePassword123";

  before(async () => {
    const hashedInitial = await bcrypt.hash(initialPassword, 10);
    const userRes = await pool.query(
      `INSERT INTO users (name, email, nid, phone, password_hash)
       VALUES ('Change Pass User', 'changepass@example.com', '9988776655', '01799887766', $1)
       RETURNING id`,
      [hashedInitial],
    );
    testUserId = userRes.rows[0].id;
  });

  after(async () => {
    if (testUserId) {
      await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
    }
  });

  describe("changePasswordSchema validation", () => {
    test("accepts valid current and new password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123",
        newPassword: "NewPassword123",
      });
      assert.equal(result.success, true);
    });

    test("rejects missing or empty current password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "NewPassword123",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.issues[0].message, "current password cannot be empty");
      }
    });

    test("rejects new password under 8 characters", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword123",
        newPassword: "short",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(
          result.error.issues[0].message,
          "new password must be at least 8 characters long",
        );
      }
    });

    test("rejects new password identical to current password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "SamePassword123",
        newPassword: "SamePassword123",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(
          result.error.issues[0].message,
          "new password must be different from current password",
        );
      }
    });
  });

  describe("changePassword service", () => {
    test("rejects incorrect current password", async () => {
      await assert.rejects(
        async () => {
          await changePassword(testUserId, "WrongPassword999", "BrandNewPassword123");
        },
        (err: any) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.message, "incorrect current password");
          return true;
        },
      );
    });

    test("rejects new password identical to stored current password", async () => {
      await assert.rejects(
        async () => {
          await changePassword(testUserId, initialPassword, initialPassword);
        },
        (err: any) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 400);
          assert.equal(err.message, "new password must be different from current password");
          return true;
        },
      );
    });

    test("rejects non-existent user", async () => {
      await assert.rejects(
        async () => {
          await changePassword(99999999, initialPassword, "BrandNewPassword123");
        },
        (err: any) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          assert.equal(err.message, "user not found");
          return true;
        },
      );
    });

    test("successfully updates password hash in database", async () => {
      const newPassword = "BrandNewPassword123";
      await changePassword(testUserId, initialPassword, newPassword);

      // Verify the database hash
      const userRes = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [testUserId],
      );
      assert.equal(userRes.rows.length, 1);
      const updatedHash = userRes.rows[0].password_hash;

      // Ensure hash is not plaintext
      assert.notEqual(updatedHash, newPassword);

      // Verify new password matches bcrypt hash
      const matchesNew = await bcrypt.compare(newPassword, updatedHash);
      assert.equal(matchesNew, true);

      // Verify old password no longer matches bcrypt hash
      const matchesOld = await bcrypt.compare(initialPassword, updatedHash);
      assert.equal(matchesOld, false);
    });
  });

  describe("changePassword controller", () => {
    test("returns 401 when req.user is undefined", async () => {
      let statusCode = 200;
      let jsonBody: any;
      const req = {
        user: undefined,
        body: { currentPassword: "OldPassword123", newPassword: "NewPassword123" },
      } as unknown as Request;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonBody = data;
          return res;
        },
      } as unknown as Response;

      await changePasswordController(req, res);
      assert.equal(statusCode, 401);
      assert.equal(jsonBody?.error, "unauthorized");
    });

    test("returns 400 when body fails schema validation", async () => {
      let statusCode = 200;
      let jsonBody: any;
      const req = {
        user: { id: testUserId, email: "changepass@example.com" },
        body: { currentPassword: "", newPassword: "short" },
      } as unknown as Request;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonBody = data;
          return res;
        },
      } as unknown as Response;

      await changePasswordController(req, res);
      assert.equal(statusCode, 400);
      assert.ok(jsonBody?.error);
    });

    test("returns 200 with success message on valid request", async () => {
      let statusCode = 200;
      let jsonBody: any;
      const req = {
        user: { id: testUserId, email: "changepass@example.com" },
        body: {
          currentPassword: "BrandNewPassword123",
          newPassword: "AnotherFreshPassword789",
        },
      } as unknown as Request;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonBody = data;
          return res;
        },
      } as unknown as Response;

      await changePasswordController(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonBody?.message, "Password changed successfully");
    });
  });
});


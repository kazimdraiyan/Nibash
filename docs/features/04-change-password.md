# Feature: Change Password

## 1. Feature Overview
The **Change Password** feature allows authenticated users (residents, tenants, property owners, and verifiers) in the Nibash application to securely update their account password. 

Previously, user passwords could only be set during initial registration, with no mechanism for existing users to update their credentials. This feature fulfills this critical operational and security requirement while maintaining user session continuity, preventing unauthorized credential tampering, and strictly adhering to Nibash's existing architectural patterns.

---

## 2. Existing Authentication Architecture
Nibash employs a stateless, token-based authentication mechanism backed by PostgreSQL:

* **Password Hashing:** Passwords are never stored in plaintext. They are hashed using `bcrypt` (`bcrypt.hash(password, 10)`) with a cost factor of 10.
* **Password Verification:** Plaintext candidate passwords are cryptographically matched against stored bcrypt hashes using `bcrypt.compare(candidate, storedHash)`.
* **Database Storage:** Password hashes are stored in the `password_hash varchar(255)` column of the `users` table.
* **Token Issuance:** Authentication tokens are signed using `jsonwebtoken` (`jwt.sign`) with the server's `JWT_SECRET` and a 7-day expiration (`expiresIn: "7d"`). The payload contains the user's ID and email: `{ id, email }`.
* **Authorization Middleware:** The `authMiddleware` extracts the JWT from the `Authorization: Bearer <token>` HTTP header, verifies the signature and expiration, checks whether the token exists in the `revoked_tokens` table, and attaches `{ id, email }` to Express's `req.user`.
* **Token Revocation:** When a user logs out, the specific token string is decoded to read its expiration and stored in `revoked_tokens (token, expires_at)`.

---

## 3. API Contract

### Endpoint
```http
PATCH /api/auth/change-password
```

### Authentication & Authorization
* **Requires Authentication:** Yes (`authMiddleware`).
* **Identity Derivation:** The user ID is retrieved solely from the verified JWT token (`req.user.id`). Client-supplied user identifiers in the body, query, or headers are ignored and rejected.

### Request Body
```json
{
  "currentPassword": "myOldPassword123",
  "newPassword": "myNewSecurePassword456"
}
```

### Field Specifications
| Field | Type | Required | Constraints |
|---|---|---|---|
| `currentPassword` | `string` | Yes | Non-empty string |
| `newPassword` | `string` | Yes | Minimum 8 characters; must differ from `currentPassword` |

### Success Response (`200 OK`)
```json
{
  "message": "Password changed successfully"
}
```

### Error Responses
* **`400 Bad Request`**
  * `{"error": "current password cannot be empty"}`
  * `{"error": "new password must be at least 8 characters long"}`
  * `{"error": "new password must be different from current password"}`
  * `{"error": "incorrect current password"}`
* **`401 Unauthorized`**
  * `{"error": "no token provided"}`
  * `{"error": "invalid token"}`
  * `{"error": "token has been revoked"}`
  * `{"error": "unauthorized"}`
* **`404 Not Found`**
  * `{"error": "user not found"}` (if user account was removed after token issuance)
* **`500 Internal Server Error`**
  * `{"error": "something went wrong"}`

---

## 4. Password Validation
Password validation is enforced authoritatively on the backend and reinforced on the frontend for responsive feedback:

### Policy Rules
1. **Presence:** Both `currentPassword` and `newPassword` are mandatory.
2. **Length Floor:** `newPassword` must contain a minimum of 8 characters.
3. **Difference:** `newPassword` must not match `currentPassword`.
4. **Confirmation:** The frontend requires `newPassword` and `confirmPassword` to match before submission.

### Enforcement Mechanism
* **Backend:** Express route validates incoming payloads with Zod (`changePasswordSchema` in `server/src/schemas/auth.schema.ts`). In addition to schema-level checks, `authService.changePassword` evaluates `await bcrypt.compare(newPassword, storedHash)` to ensure that the new password is cryptographically distinct from the current password hash in the database.
* **Frontend:** `ChangePasswordModal.tsx` validates field emptiness, length constraints, password equality between new and confirmation fields, and dissimilarity between current and new passwords prior to making an API call.

---

## 5. Password Update Process

```text
User opens Profile Menu in Navbar
                |
                v
Selects "Change Password"
                |
                v
ChangePasswordModal opens
                |
                v
User enters Current Password, New Password, & Confirm New Password
                |
                v
Frontend Validation (Length, confirmation match, difference)
                |
                v
API Request: PATCH /api/auth/change-password
(Includes Authorization: Bearer <jwt>)
                |
                v
Express Router -> authMiddleware
(Verifies JWT signature, expiration, and revocation status)
                |
                v
authController.changePassword
(Zod schema safeParse validation)
                |
                v
authService.changePassword
  1. Fetch user by req.user.id
  2. Verify currentPassword with bcrypt.compare against users.password_hash
  3. Verify newPassword is not identical to users.password_hash
  4. Hash newPassword with bcrypt.hash(newPassword, 10)
  5. Parameterized SQL UPDATE users SET password_hash = $1 WHERE id = $2
                |
                v
Returns 200 OK: {"message": "Password changed successfully"}
                |
                v
Frontend receives success:
  - Displays green confirmation banner
  - Clears password input fields
  - Automatically closes modal after brief delay
```

---

## 6. Session Handling
* **Current Session:** The user remains logged in on their current session without interruption. Because the user has successfully validated their identity by supplying their valid current password, requiring an immediate re-login is unnecessary friction.
* **Other Active Sessions & Technical Boundaries:** Nibash employs stateless JWTs with a 7-day time-to-live (`expiresIn: "7d"`). The application's server-side revocation list (`revoked_tokens`) only tracks individual tokens that have explicitly been submitted to `/api/auth/logout`. There is no per-user token versioning column or server-side active session table. Consequently, other concurrent sessions will remain active until their natural 7-day expiration. In compliance with the minimal-scope principle, no unrequested architectural changes to global session tracking were introduced.

---

## 7. Frontend Integration
* **Placement & Navigation:** The feature is accessible from the authenticated user's `ProfileMenu` dropdown in the top navigation bar (`client/src/components/ProfileMenu.tsx`). Selecting "Change Password" routes the user directly to `/change-password` via React Router (`navigate("/change-password")`).
* **Dedicated Page:** Implemented in `client/src/pages/ChangePasswordPage.tsx`, matching the two-column dark luxury layout of `LoginPage.tsx` (`#12151c`, `#090a0c`, slate borders, and metallic accents).
* **Protected Route:** Protected by `<ProtectedRoute>` in `client/src/App.tsx`.
* **Login Page Clean-up:** The unconfigured "Forgot password?" placeholder button has been removed from `LoginPage.tsx`.
* **UI Features:**
  * Left-column branding card emphasizing 256-bit bcrypt encryption and identity verification.
  * Right-column dedicated form with Current Password, New Password, and Confirm New Password inputs.
  * Toggleable show/hide visibility buttons (`visibility` / `visibility_off`) on all three password inputs.
  * In-place red error banner for backend or client validation errors.
  * In-place green success banner upon successful completion, followed by automatic redirect to the homepage.
  * Submit button loading state with spinner and disabled states to prevent double submissions.
  * "Back to previous page" button allowing easy cancellation.

---

## 8. Security

1. **Server-Side Authority:** Password verification is executed exclusively on the server with `bcrypt.compare`.
2. **Identity Isolation:** The user identity is established exclusively via `req.user.id` unpacked from the cryptographically verified JWT token. Users cannot alter credentials for other accounts.
3. **No Sensitive Data Exposure:**
   * Plaintext passwords and bcrypt password hashes are never returned in HTTP responses.
   * Neither passwords nor hashes are logged in server outputs or console streams.
   * Errors return sanitized messages (`"incorrect current password"`), avoiding internal database or stack trace exposure.
4. **SQL Injection Defense:** All database interactions utilize PostgreSQL parameterized queries (`$1, $2`).

---

## 9. Database Changes
* **Schema Modifications:** None.
* **Rationale:** The existing `users` table schema already includes `password_hash varchar(255) not null`. The password update operation updates this column in-place:
  ```sql
  UPDATE users SET password_hash = $1 WHERE id = $2
  ```
* No new tables or migrations were required, and 100% of existing user data, relations, and database triggers were preserved.

---

## 10. Testing
Comprehensive automated and static verification was conducted:

### Automated Backend Tests (`server/src/services/__tests__/change_password.test.ts`)
* **Schema Validation Tests:**
  * Accepted valid current and new password combinations.
  * Rejected missing or empty current passwords (`400`).
  * Rejected new passwords under 8 characters (`400`).
  * Rejected new passwords identical to current password (`400`).
* **Service Integration Tests:**
  * Rejected incorrect current password with `AppError(400, "incorrect current password")`.
  * Rejected new password identical to stored hash with `AppError(400, "new password must be different from current password")`.
  * Rejected non-existent user ID with `AppError(404, "user not found")`.
  * Successfully hashed new password and updated database record.
  * Verified new password authenticates with `bcrypt.compare`.
  * Verified old password no longer authenticates with `bcrypt.compare`.
  * Confirmed that stored value is a bcrypt hash and not plaintext.
* **Controller Unit Tests:**
  * Returned `401 Unauthorized` when `req.user` is undefined.
  * Returned `400 Bad Request` on invalid body payload.
  * Returned `200 OK` with `{"message": "Password changed successfully"}` on valid request.
* **Test Suite Result:** 39 passed, 0 failed across all backend test suites.

### Frontend Verification
* Executed TypeScript build (`npm run build` in `client/`): Compiled 65 modules into production distribution with 0 errors.
* Executed Linter (`npm run lint` with `oxlint`): 0 errors on all components.

---

## 11. Files Changed

### Backend Files
* `server/src/schemas/auth.schema.ts` (Modified): Added `changePasswordSchema` and exported `ChangePasswordInput`.
* `server/src/services/auth.service.ts` (Modified): Added `changePassword` function with verification and update logic.
* `server/src/controllers/auth.controller.ts` (Modified): Added `changePassword` controller action.
* `server/src/routes/auth.route.ts` (Modified): Mounted `PATCH /change-password` with `authMiddleware`.
* `server/src/services/__tests__/change_password.test.ts` (Created): Integration test suite for change password feature.

### Frontend Files
* `client/src/pages/ChangePasswordPage.tsx` (Created): Dedicated Change Password page matching the two-column layout of `LoginPage`.
* `client/src/components/ProfileMenu.tsx` (Modified): Updated "Change Password" action to navigate cleanly to `/change-password`.
* `client/src/components/LoginPage.tsx` (Modified): Removed the unconfigured "Forgot password?" button.
* `client/src/App.tsx` (Modified): Added protected `/change-password` route.

### Documentation Files
* `docs/features/04-change-password.md` (Created): Comprehensive feature documentation.


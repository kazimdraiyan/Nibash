# Feature: Tenant History per Listing

## 1. Feature Overview
The **Tenant History per Listing** feature enables authenticated property owners on Nibash to inspect the **public records of current and past tenants** for each of their properties.

This feature provides landlords with visibility into:
1. **Present Tenants:** Individuals currently occupying the apartment under an active, signed lease agreement.
2. **Past Tenants:** Former occupants who previously rented the apartment under concluded or expired contracts.

The information is organized per listing and integrated directly into the owner's property management workflow:
- **My Listings Page (`/my-listings`):** Quick-access "Tenants" badge button on each property card.
- **Listing Details Page (`/listings/:id#tenant-history`):** A dedicated, dual-tabbed **Tenant History** section with deep-link hash scrolling and tab navigation between Current and Past tenants.

---

## 2. Tenancy Classification & Business Rules

To ensure strict data integrity and prevent misclassifying non-tenants, Nibash derives tenant relationships exclusively from **contractual agreements (`contracts` table)** rather than application inquiries:

| Category | Classification Rules | Technical Condition |
|---|---|---|
| **Present Tenants (Current Occupants)** | Active, signed contract where the end date has not passed | `contracts.status = 'signed' AND (contracts.end_date IS NULL OR contracts.end_date >= CURRENT_DATE)` |
| **Past Tenants (Former Occupants)** | Formally completed lease OR signed lease where the end date has lapsed | `contracts.status = 'completed' OR (contracts.status = 'signed' AND contracts.end_date < CURRENT_DATE)` |
| **Unsigned Proposals (Excluded)** | Proposed lease offer not yet signed/accepted by tenant | `contracts.status = 'proposed'` (Excluded from tenant history) |
| **Rental Applicants (Excluded)** | Inquiries or submitted applications that never resulted in a signed contract | Records in `applies` table (Excluded from tenant history) |

### Non-Tenant Exclusion Policy
In accordance with Nibash core guidelines, users are **NEVER** classified as tenants based solely on:
- Having submitted a rental application
- Having an application approved by the landlord
- Having created a tenant profile
- Having expressed interest or starred a property
- Having an unaccepted contract proposal

---

## 3. Data Privacy & Confidentiality Safeguards

Nibash enforces a strict boundary between public tenant information disclosed to landlords and private user credentials:

### Disclosed Fields (Authorized & Safe)
- **`tenantId`:** Platform identifier of the tenant user
- **`name`:** Tenant's full name (`users.name`)
- **`email`:** Contact email (`users.email`)
- **`phone`:** Contact telephone number (`users.phone`)
- **`emergencyContact`:** Emergency contact phone number (`tenants.emergency_contact`)
- **`startDate`:** Lease commencement date (`contracts.start_date`)
- **`endDate`:** Lease expiration or conclusion date (`contracts.end_date`)
- **`monthlyRent`:** Contractually agreed monthly rent (`terms.rent`)
- **`contractStatus`:** Status of the lease agreement (`'signed'` or `'completed'`)
- **`contractId`:** Contract identifier with direct navigation link

### Strictly Confidential Fields (NEVER Exposed)
- **`password_hash`:** Password hashes are strictly excluded from queries and serialization.
- **`nid`:** National Identity Numbers are sensitive government identifiers and are strictly omitted.
- **`monthly_income`:** Private tenant financial self-reports from application forms are omitted from tenant history.
- **Payment credentials & tokens:** Bank/MFS transaction credentials, verification IDs, and tokens are omitted.

---

## 4. API Specification

### Endpoint: `GET /api/listings/:id/tenants`
- **Authentication:** Required (`authMiddleware` via Bearer JWT).
- **Authorization:** Only the owner of the listing can access this endpoint (`listing.owner_id === req.user.id`).
- **Response Format:** JSON.

#### Request Parameters
- `id` (path param, integer): Listing identifier.

#### Success Response (`200 OK`)
```json
{
  "listingId": 12,
  "listingTitle": "Gulshan Lakeview Luxury Penthouse",
  "currentTenants": [
    {
      "contractId": 5,
      "tenantId": 8,
      "name": "Rahim Ahmed",
      "email": "rahim@example.com",
      "phone": "01711111111",
      "emergencyContact": "01722222222",
      "startDate": "2025-06-01",
      "endDate": "2026-05-31",
      "monthlyRent": 25000,
      "contractStatus": "signed",
      "createdAt": "2025-05-28T10:00:00.000Z"
    }
  ],
  "pastTenants": [
    {
      "contractId": 2,
      "tenantId": 4,
      "name": "Karim Hossain",
      "email": "karim@example.com",
      "phone": "01811111111",
      "emergencyContact": "01822222222",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "monthlyRent": 22000,
      "contractStatus": "completed",
      "createdAt": "2023-12-20T10:00:00.000Z"
    }
  ]
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: `{"error": "you are not authorized to view tenant history for this listing"}` when the authenticated user does not own the listing.
- `404 Not Found`: `{"error": "listing not found"}` if the requested listing ID does not exist.
- `400 Bad Request`: `{"error": "invalid listing id"}` if the path parameter is non-numeric or non-positive.

---

## 5. Frontend Architecture & UI Components

### 1. `MyListingsPage.tsx`
- Each `MyListingCard` component includes an inline quick-action shortcut:
  ```tsx
  <Link
    to={`/listings/${item.id}#tenant-history`}
    className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30"
  >
    <span className="material-symbols-outlined text-xs">history</span>
    <span>Tenants</span>
  </Link>
  ```
- Clicking immediately routes the owner to the listing's details page and triggers automatic smooth scrolling to the `#tenant-history` anchor.

### 2. `ListingDetailPage.tsx`
- **Owner-Gated Rendering:** Displayed only when `isOwner === true`.
- **Location:** Positioned in the main column alongside "Applications Received" and "Verification Documents".
- **Sidebar Integration:** "View Tenant History" button added inside the Owner Controls sidebar panel for quick jumping.
- **Dual Tab Interface:**
  - **Current Tenants Tab:** Displays active leaseholder cards with emerald indicator dots, lease start date, contract link, and contact details. Includes clean empty-state fallback ("No active tenants currently occupying this apartment.").
  - **Past Tenants Tab:** Displays historical tenant cards with tenancy duration (`Start Date — End Date`), completed lease badge, agreed rent, and contact details. Includes empty-state fallback ("No past tenants recorded for this property.").
- **Error & Loading States:** Dedicated spinner during network fetch and inline banner with retry action upon network errors.

---

## 6. Database Schema Impact

- **Existing Tables Utilized:** `listings`, `contracts`, `users`, `tenants`, `agreements`, `terms`.
- **Existing Indexes Utilized:**
  - `idx_contracts_listing_status ON contracts(listing_id, status)` (Migration 012)
  - `idx_listings_owner_id ON listings(owner_id)` (Migration 012)
- **Migrations Required:** **NONE**. All database entities, relations, and indexes already existed in the database schema.

---

## 7. Automated Test Suite

A comprehensive test suite is implemented in `server/src/services/__tests__/tenant_history.test.ts` covering:

1. **Ownership Authorization:**
   - Owner can successfully retrieve tenant history for their own property.
   - Non-owner attempting to access another landlord's listing receives `403 Forbidden`.
   - Non-existent listing ID returns `404 Not Found`.
2. **Classification Logic:**
   - Active signed contract is classified into `currentTenants`.
   - Completed lease is classified into `pastTenants`.
   - Proposed (unsigned) contracts are strictly excluded.
   - Applicants who never signed contracts are never included.
   - Listing with no rental history returns empty arrays (`currentTenants: []`, `pastTenants: []`).
3. **Data Confidentiality:**
   - Verifies `password_hash`, `nid`, and `monthly_income` are completely absent from response records.

**Test Run Results:**
```
▶ Feature: Tenant History per Listing
  ▶ 1. Ownership & Authorization
    ✔ Owner can successfully view tenant history for their own listing
    ✔ Non-owner is forbidden (403) from viewing another owner's listing tenant history
    ✔ Requesting non-existent listing throws 404
  ✔ 1. Ownership & Authorization
  ▶ 2. Tenant Classification (Present vs Past)
    ✔ Active signed contract is correctly classified in currentTenants
    ✔ Completed contract is correctly classified in pastTenants
    ✔ Proposed (unsigned) contracts are EXCLUDED from tenant history
    ✔ Applicants without signed contracts are NEVER classified as tenants
    ✔ Listing with no contracts returns empty arrays for both current and past
  ✔ 2. Tenant Classification (Present vs Past)
  ▶ 3. Data Privacy & Confidentiality
    ✔ Sensitive fields (password_hash, nid, monthly_income) are NEVER exposed
  ✔ 3. Data Privacy & Confidentiality
✔ Feature: Tenant History per Listing
ℹ tests 9
ℹ suites 4
ℹ pass 9
ℹ fail 0
```

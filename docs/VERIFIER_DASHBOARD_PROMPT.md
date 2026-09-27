# Verifier Dashboard — Implementation Prompt

> **Goal**: Build a dedicated analytics dashboard for verifier users at route `/verify/dashboard`.
> It surfaces platform health metrics, growth trends, and fraud/integrity signals — giving verifiers situational awareness before they review individual listings.
>
> **Constraint**: Do NOT modify any existing file, route, or component. All work is purely additive — new files only.

---

## Architecture Context (read-only reference)

| Layer | Stack | Pattern |
|---|---|---|
| **Database** | PostgreSQL, raw `pg` driver, no ORM | Parameterized `pool.query()` and `client.query("BEGIN")` transactions |
| **Backend** | Express 5 + TypeScript | `routes/ → middleware/ → controllers/ → services/ → pool.query()` |
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 | Pages in `client/src/pages/`, API via `apiClient` from `client/src/api/client.ts` |
| **Auth** | JWT in `Authorization: Bearer` header | `authMiddleware` attaches `req.user.id`; `requireVerifier` checks `verifiers` table |
| **Roles** | **No `role` column on `users`** | Subtypes: `owners(user_id)`, `tenants(user_id)`, `verifiers(user_id)` — mutually exclusive via triggers |

### Critical Schema Quirks You Must Respect

1. **Rent is NOT on `listings`**. It lives in `terms`, joined via `initial_terms`:
   ```sql
   listings → initial_terms(listing_id → terms_id) → terms(rent)
   ```

2. **Photos are NOT on `listings`**. They live in `media`, joined via `listing_media`:
   ```sql
   listings → listing_media(listing_id → media_id) → media(media_path)
   ```

3. **`listings` has no `created_at` column**. A migration must add one before growth-trend queries work.

4. **`area_id`** on `listings` references `areas(id)` which has `name` (e.g. 'Dhanmondi', 'Gulshan', 'Mirpur').

5. **Contracts**: `contracts.status IN ('proposed', 'signed', 'completed')`. `'signed'` = currently active.

---

## Prerequisite: Database Migration

> **File**: `db/migrations/008_listing_created_at.sql`

The `listings` table lacks a `created_at` timestamp, which is required for the "New Listings per Week" growth chart. Add it with a sensible default so existing rows aren't null:

```sql
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

This is a non-destructive `ALTER TABLE ADD COLUMN`. Existing rows get `CURRENT_TIMESTAMP` as their `created_at` — not historically accurate for old seed data, but acceptable since the chart only matters once real data flows in.

---

## Part 1 — Backend

All new files. Follow the existing `service → controller → route` pattern.

---

### 1.1 Service: `server/src/services/dashboard.service.ts`

This file contains **all** raw SQL queries for the dashboard. Every function returns a plain object or array — no Express `req`/`res` here.

#### 1.1.1 — Platform Overview Counts

```typescript
import { pool } from "../db/pool.js";

export async function getPlatformOverview() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int                                    AS total_users,
      (SELECT COUNT(*) FROM owners)::int                                   AS total_owners,
      (SELECT COUNT(*) FROM tenants)::int                                  AS total_tenants,
      (SELECT COUNT(*) FROM listings WHERE status = 'approved')::int       AS listings_approved,
      (SELECT COUNT(*) FROM listings WHERE status = 'waiting')::int        AS listings_waiting,
      (SELECT COUNT(*) FROM listings WHERE status = 'rejected')::int       AS listings_rejected,
      (SELECT COUNT(*) FROM listings WHERE status = 'occupied')::int       AS listings_occupied,
      (SELECT COUNT(*) FROM contracts WHERE status = 'signed')::int        AS active_contracts
  `);
  return result.rows[0];
}
```

**Why a single query with scalar subselects?** Each `SELECT COUNT(*)` scans a different table, but PostgreSQL executes them all in one round-trip. For a dashboard that loads once on page mount, this is simpler and faster than 8 separate `pool.query()` calls.

---

#### 1.1.2 — Growth Trends (Last 8 Weeks)

```typescript
export async function getGrowthTrends() {
  const signups = await pool.query(`
    SELECT
      DATE_TRUNC('week', created_at)::date AS week,
      COUNT(*)::int                        AS count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week
  `);

  const newListings = await pool.query(`
    SELECT
      DATE_TRUNC('week', created_at)::date AS week,
      COUNT(*)::int                        AS count
    FROM listings
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week
  `);

  return {
    signups_per_week: signups.rows,
    listings_per_week: newListings.rows,
  };
}
```

**Note**: The `listings.created_at` column comes from migration `008`. If it hasn't been applied, this query will fail — that's intentional, it forces the migration to be run first.

---

#### 1.1.3 — Fraud Signal: Owners Ranked by Listing Count

```typescript
export async function getOwnersByListingCount() {
  const result = await pool.query(`
    SELECT
      u.id         AS owner_id,
      u.name,
      u.email,
      u.phone,
      COUNT(l.id)::int AS listing_count
    FROM users u
    JOIN owners o  ON o.user_id = u.id
    JOIN listings l ON l.owner_id = o.user_id
    WHERE l.status != 'unavailable'
    GROUP BY u.id, u.name, u.email, u.phone
    ORDER BY listing_count DESC
  `);
  return result.rows;
}
```

**Design choice**: No hardcoded cutoff (e.g. `HAVING COUNT(*) > 5`). The verifier scans the top of the sorted table and uses their own judgment about what looks off. A landlord with 3 listings in a city of small-time owners might be just as suspicious as one with 30 in a market full of property companies.

---

#### 1.1.4 — Fraud Signal: Tenants with Concurrent Active Contracts (>1)

```typescript
export async function getConcurrentTenants() {
  const result = await pool.query(`
    SELECT
      u.id         AS tenant_id,
      u.name,
      u.email,
      u.phone,
      COUNT(c.id)::int           AS active_contract_count,
      ARRAY_AGG(c.listing_id)    AS listing_ids
    FROM users u
    JOIN tenants ten ON ten.user_id = u.id
    JOIN contracts c ON c.tenant_id = ten.user_id
    WHERE c.status = 'signed'
    GROUP BY u.id, u.name, u.email, u.phone
    HAVING COUNT(c.id) > 1
    ORDER BY active_contract_count DESC
  `);
  return result.rows;
}
```

**Why this is the highest-confidence fraud signal**: A person cannot physically live in two apartments at the same time. Either someone is subletting (against most lease terms), using a fake identity to occupy multiple units, or the data is wrong. Every row here demands investigation.

---

#### 1.1.5 — Fraud Signal: Rent Outliers by Area (CTE + STDDEV)

This is the most advanced query in the entire project — a genuine database flex worth walking a professor through.

```typescript
export async function getRentOutliers() {
  const result = await pool.query(`
    WITH area_stats AS (
      SELECT
        l.area_id,
        a.name                 AS area_name,
        AVG(t.rent)            AS avg_rent,
        STDDEV_POP(t.rent)     AS stddev_rent,
        COUNT(*)::int          AS listing_count
      FROM listings l
      JOIN initial_terms it ON it.listing_id = l.id
      JOIN terms t          ON t.id = it.terms_id
      JOIN areas a          ON a.id = l.area_id
      WHERE l.status NOT IN ('unavailable', 'rejected')
      GROUP BY l.area_id, a.name
      HAVING COUNT(*) >= 3
    )
    SELECT
      l.id              AS listing_id,
      l.title,
      u.name            AS owner_name,
      s.area_name,
      t.rent,
      ROUND(s.avg_rent::numeric, 0)     AS area_avg_rent,
      ROUND(s.stddev_rent::numeric, 0)  AS area_stddev_rent,
      ROUND(
        ABS(t.rent - s.avg_rent) / NULLIF(s.stddev_rent, 0), 2
      )                 AS z_score
    FROM listings l
    JOIN initial_terms it ON it.listing_id = l.id
    JOIN terms t          ON t.id = it.terms_id
    JOIN area_stats s     ON s.area_id = l.area_id
    JOIN users u          ON u.id = l.owner_id
    WHERE ABS(t.rent - s.avg_rent) > 2 * s.stddev_rent
      AND s.stddev_rent > 0
      AND l.status NOT IN ('unavailable', 'rejected')
    ORDER BY z_score DESC
  `);
  return result.rows;
}
```

**Breaking this down for a viva/defense**:

| Concept | What it does |
|---|---|
| **CTE (`WITH area_stats AS ...`)** | Pre-computes the average and standard deviation of rent per area, filtering to areas with >=3 listings (below that, stddev is meaningless). |
| **`AVG(t.rent)`** | The statistical center of rents in that area. |
| **`STDDEV_POP(t.rent)`** | Population standard deviation — how spread out rents are in the area. |
| **`HAVING COUNT(*) >= 3`** | A statistical guard. With only 1-2 data points, every value is an "outlier." |
| **`NULLIF(s.stddev_rent, 0)`** | Prevents division-by-zero when all rents in an area are identical (stddev = 0). |
| **`> 2 * s.stddev_rent`** | The 2-sigma threshold. In a normal distribution, ~95% of values fall within 2 standard deviations. Anything outside is flagged. |
| **`z_score`** | How many standard deviations away from the mean. A z-score of 3.5 means the rent is 3.5x the typical spread away from average — extremely suspicious. |

**Real-world example**: If Dhanmondi listings average ৳35,000/month with stddev ৳8,000, a listing at ৳3,000 has a z-score of 4.0 — either a scam price to bait clicks, or a data entry error (missed a zero).

---

#### 1.1.6 — Fraud Signal: Listings with Zero Photos

```typescript
export async function getListingsWithNoPhotos() {
  const result = await pool.query(`
    SELECT
      l.id       AS listing_id,
      l.title,
      l.status,
      u.name     AS owner_name,
      u.email    AS owner_email,
      a.name     AS area_name
    FROM listings l
    JOIN users u ON u.id = l.owner_id
    JOIN areas a ON a.id = l.area_id
    LEFT JOIN listing_media lm ON lm.listing_id = l.id
    WHERE lm.listing_id IS NULL
      AND l.status NOT IN ('unavailable')
    ORDER BY l.id DESC
  `);
  return result.rows;
}
```

**Why `LEFT JOIN ... WHERE IS NULL`?** An `INNER JOIN` on `listing_media` would return only listings *with* photos — the opposite of what we want. The LEFT JOIN keeps listings that have no match in `listing_media`, and the `WHERE lm.listing_id IS NULL` filters to exactly those zero-photo listings.

---

#### 1.1.7 — Fraud Signal: Duplicate Location Detection (Self-Join)

```typescript
export async function getDuplicateLocations() {
  const result = await pool.query(`
    SELECT
      l1.id        AS listing_1_id,
      l1.title     AS listing_1_title,
      u1.name      AS owner_1_name,
      l2.id        AS listing_2_id,
      l2.title     AS listing_2_title,
      u2.name      AS owner_2_name,
      a.name       AS area_name,
      ROUND(ABS(l1.latitude  - l2.latitude)::numeric,  6) AS lat_diff,
      ROUND(ABS(l1.longitude - l2.longitude)::numeric, 6) AS lng_diff
    FROM listings l1
    JOIN listings l2 ON l1.id < l2.id
                    AND l1.owner_id != l2.owner_id
                    AND ABS(l1.latitude  - l2.latitude)  < 0.0005
                    AND ABS(l1.longitude - l2.longitude) < 0.0005
    JOIN users u1 ON u1.id = l1.owner_id
    JOIN users u2 ON u2.id = l2.owner_id
    JOIN areas a  ON a.id  = l1.area_id
    WHERE l1.status NOT IN ('unavailable', 'rejected')
      AND l2.status NOT IN ('unavailable', 'rejected')
    ORDER BY (ABS(l1.latitude - l2.latitude) + ABS(l1.longitude - l2.longitude)) ASC
  `);
  return result.rows;
}
```

**Breaking this down for a viva/defense**:

| Clause | Purpose |
|---|---|
| **`l1.id < l2.id`** | A self-join naturally produces every pair twice (A-B and B-A) plus matches against itself (A-A). The `<` constraint keeps only one direction and excludes self-matches. Without this, a pair of listings would appear twice in the results. |
| **`l1.owner_id != l2.owner_id`** | Same owner listing the same GPS coordinates twice is not fraud — it is a forgotten duplicate or a multi-unit building. We only care about *different* owners claiming the same spot. |
| **`ABS(l1.latitude - l2.latitude) < 0.0005`** | 0.0005 degrees of latitude is roughly **55 meters**. Close enough to be "same building or right next door," far enough to not falsely match different buildings on the same street. GPS pins are never bit-for-bit identical for the same physical building due to floating-point precision and slightly different pin placements, so `WHERE latitude = latitude` would catch nothing. |
| **`ABS(l1.longitude - l2.longitude) < 0.0005`** | Same logic for longitude. At Dhaka's latitude (~23.7 degrees N), 0.0005 degrees longitude is roughly **51 meters**. |
| **`ORDER BY (lat_diff + lng_diff)`** | Sorts by proximity — the closest matches (most suspicious) appear first. |

**Tuning**: The `0.0005` threshold is conservative. If false positives appear (e.g. two legitimate different buildings in a dense neighborhood), tighten it to `0.0003` (~33m). If the query misses known duplicates, loosen it to `0.0008` (~88m).

---

### 1.2 Controller: `server/src/controllers/dashboard.controller.ts`

Thin layer — calls services, sends JSON. Matches the existing pattern in `verify.controller.ts`.

```typescript
import { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";

export async function getDashboard(req: Request, res: Response) {
  const [overview, growth, ownerRanking, concurrentTenants, rentOutliers, noPhotos, duplicateLocations] =
    await Promise.all([
      dashboardService.getPlatformOverview(),
      dashboardService.getGrowthTrends(),
      dashboardService.getOwnersByListingCount(),
      dashboardService.getConcurrentTenants(),
      dashboardService.getRentOutliers(),
      dashboardService.getListingsWithNoPhotos(),
      dashboardService.getDuplicateLocations(),
    ]);

  res.json({
    overview,
    growth,
    fraud: {
      owners_by_listing_count: ownerRanking,
      concurrent_tenants: concurrentTenants,
      rent_outliers: rentOutliers,
      listings_no_photos: noPhotos,
      duplicate_locations: duplicateLocations,
    },
  });
}
```

**Why `Promise.all`?** All 7 queries are independent reads against different data. Running them in parallel instead of sequentially cuts total latency from ~7x a single query's time to ~1x the slowest query's time.

---

### 1.3 Route: `server/src/routes/dashboard.route.ts`

```typescript
import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { requireVerifier } from "../middleware/verifier.js";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireVerifier,
  asyncHandler(dashboardController.getDashboard)
);

export default router;
```

---

### 1.4 Mount the Route: `server/src/index.ts`

Add **one line** to the existing route-mounting section in `server/src/index.ts`:

```typescript
import dashboardRoutes from "./routes/dashboard.route.js";
// ...
app.use("/api/dashboard", dashboardRoutes);
```

This mounts the endpoint as `GET /api/dashboard`, protected by `authMiddleware` + `requireVerifier`.

> **Note**: This is the ONLY existing backend file that needs a single import + one mount line added. Everything else is purely new files.

---

### 1.5 API Response Shape

The `GET /api/dashboard` response has this shape:

```jsonc
{
  "overview": {
    "total_users": 142,
    "total_owners": 38,
    "total_tenants": 97,
    "listings_approved": 65,
    "listings_waiting": 12,
    "listings_rejected": 3,
    "listings_occupied": 28,
    "active_contracts": 28
  },
  "growth": {
    "signups_per_week": [
      { "week": "2026-08-03", "count": 8 },
      { "week": "2026-08-10", "count": 12 }
    ],
    "listings_per_week": [
      { "week": "2026-08-03", "count": 3 },
      { "week": "2026-08-10", "count": 7 }
    ]
  },
  "fraud": {
    "owners_by_listing_count": [
      { "owner_id": 5, "name": "Karim", "email": "karim@example.com", "phone": "01712345678", "listing_count": 14 }
    ],
    "concurrent_tenants": [
      { "tenant_id": 22, "name": "Rina", "email": "rina@example.com", "phone": "01898765432", "active_contract_count": 2, "listing_ids": [7, 19] }
    ],
    "rent_outliers": [
      { "listing_id": 41, "title": "Cheap flat in Dhanmondi", "owner_name": "Fahim", "area_name": "Dhanmondi", "rent": 3000, "area_avg_rent": 35000, "area_stddev_rent": 8000, "z_score": 4.00 }
    ],
    "listings_no_photos": [
      { "listing_id": 55, "title": "2BR near lake", "status": "waiting", "owner_name": "Shahed", "owner_email": "shahed@example.com", "area_name": "Mirpur" }
    ],
    "duplicate_locations": [
      { "listing_1_id": 12, "listing_1_title": "Modern flat", "owner_1_name": "Ali", "listing_2_id": 34, "listing_2_title": "Spacious apartment", "owner_2_name": "Rafiq", "area_name": "Gulshan", "lat_diff": 0.000120, "lng_diff": 0.000085 }
    ]
  }
}
```

---

## Part 2 — Frontend

All new files. Follow existing page/component conventions (Tailwind CSS 4, `apiClient`, `useAuth()`).

---

### 2.1 New Route

In `client/src/App.tsx`, add a new route inside `<Routes>`:

```tsx
<Route path="/verify/dashboard" element={<ProtectedRoute><VerifierDashboardPage /></ProtectedRoute>} />
```

Import the page:
```tsx
import { VerifierDashboardPage } from "./pages/VerifierDashboardPage";
```

---

### 2.2 Dashboard Page: `client/src/pages/VerifierDashboardPage.tsx`

#### Page Structure

```
+--------------------------------------------------+
|  Shield-icon  Verifier Dashboard                  |
+--------------------------------------------------+
|  Section 1: Platform Overview                     |
|  +------+ +------+ +------+ +------+ +------+    |
|  |Users | |Owners| |Tenant| |Listed| |Active|    |
|  | 142  | |  38  | |  97  | |  65  | |  28  |    |
|  +------+ +------+ +------+ +------+ +------+    |
|  + smaller row: Waiting (12) Rejected (3)         |
|         Occupied (28)                             |
+--------------------------------------------------+
|  Section 2: Growth Trends                         |
|  +------------------------------------------+    |
|  |  Line chart: Signups & Listings per week  |    |
|  |  (last 8 weeks, dual series)              |    |
|  +------------------------------------------+    |
+--------------------------------------------------+
|  Section 3: Fraud & Integrity Signals             |
|                                                   |
|  3a. Owners by Listing Count         [table]      |
|  3b. Concurrent Active Tenants       [table]      |
|  3c. Rent Outliers by Area           [table]      |
|  3d. Listings with No Photos         [table]      |
|  3e. Duplicate Location Detection    [table]      |
+--------------------------------------------------+
|  Section 4: Action                                |
|  +--------------------------------------+         |
|  | "Review New Listings ->"  (button)   |         |
|  | navigates to /listings?view=pending  |         |
|  +--------------------------------------+         |
+--------------------------------------------------+
```

#### Data Fetching Pattern

Follow the existing pattern used in every page (`useEffect` + `apiClient` + loading/error state):

```tsx
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";

// Define the response type matching the API shape from Part 1
interface DashboardData {
  overview: {
    total_users: number;
    total_owners: number;
    total_tenants: number;
    listings_approved: number;
    listings_waiting: number;
    listings_rejected: number;
    listings_occupied: number;
    active_contracts: number;
  };
  growth: {
    signups_per_week: Array<{ week: string; count: number }>;
    listings_per_week: Array<{ week: string; count: number }>;
  };
  fraud: {
    owners_by_listing_count: Array<{ owner_id: number; name: string; email: string; phone: string; listing_count: number }>;
    concurrent_tenants: Array<{ tenant_id: number; name: string; email: string; phone: string; active_contract_count: number; listing_ids: number[] }>;
    rent_outliers: Array<{ listing_id: number; title: string; owner_name: string; area_name: string; rent: number; area_avg_rent: number; area_stddev_rent: number; z_score: number }>;
    listings_no_photos: Array<{ listing_id: number; title: string; status: string; owner_name: string; owner_email: string; area_name: string }>;
    duplicate_locations: Array<{ listing_1_id: number; listing_1_title: string; owner_1_name: string; listing_2_id: number; listing_2_title: string; owner_2_name: string; area_name: string; lat_diff: number; lng_diff: number }>;
  };
}

export function VerifierDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard: non-verifiers get redirected
  if (user && !user.is_verifier) {
    return <Navigate to="/listings" replace />;
  }

  useEffect(() => {
    apiClient.get<DashboardData>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return /* spinner matching existing App.tsx pattern */;
  if (error) return /* error banner */;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Section 1: Overview stat cards */}
      {/* Section 2: Growth chart */}
      {/* Section 3: Fraud tables */}
      {/* Section 4: Action button */}
    </div>
  );
}
```

---

### 2.3 Section 1 — Platform Overview

Render 5 primary stat cards in a responsive grid (`grid-cols-2 md:grid-cols-5`), then a secondary row with the 3 status breakdowns.

Each stat card is a simple `<div>` with:
- A label (e.g. "Total Users")
- A large number
- Use Tailwind classes: `bg-[#111214] border border-white/10 rounded-xl p-6` to match the project's dark theme

Primary cards:

| Label | Value key |
|---|---|
| Total Users | `overview.total_users` |
| Owners | `overview.total_owners` |
| Tenants | `overview.total_tenants` |
| Approved Listings | `overview.listings_approved` |
| Active Contracts | `overview.active_contracts` |

Secondary row (smaller, muted text):

| Label | Value key | Accent |
|---|---|---|
| Waiting | `overview.listings_waiting` | amber |
| Rejected | `overview.listings_rejected` | red |
| Occupied | `overview.listings_occupied` | blue |

---

### 2.4 Section 2 — Growth Trends (Line Chart)

**Charting library**: Use a lightweight client-side SVG chart. Options in order of preference:

1. **Recharts** (`recharts`) — the standard React charting library. Install: `npm install recharts`.
2. **Hand-rolled SVG** — if zero-dependency is preferred. Draw `<polyline>` points calculated from the data.

Either way, render a single line chart with **two series**:
- **New Signups** (from `growth.signups_per_week`) — e.g. blue line
- **New Listings** (from `growth.listings_per_week`) — e.g. amber line

X-axis: week labels (e.g. "Aug 3", "Aug 10", ..., 8 ticks).
Y-axis: count.

Both series share the same x-axis (week buckets). If a week has signups but no listings (or vice versa), that series shows 0 for that week — merge the two arrays by week key before charting.

Wrap the chart in a card container matching the dark theme.

---

### 2.5 Section 3 — Fraud & Integrity Signals

This is the centerpiece. Each subsection is a collapsible card (use a `<details>` element or state toggle) with a count badge in the header.

#### 3a. Owners Ranked by Listing Count

| Column | Key | Notes |
|---|---|---|
| # | row index | |
| Owner Name | `name` | |
| Email | `email` | |
| Phone | `phone` | |
| Listings | `listing_count` | **Bold**, right-aligned |

- Sorted descending by `listing_count` (already sorted from API).
- No hardcoded cutoff — show all rows. Verifier scans top of the list.
- Header shows total count: "Owners by Listing Count (38)"

#### 3b. Tenants with Concurrent Active Contracts

| Column | Key | Notes |
|---|---|---|
| Tenant Name | `name` | |
| Email | `email` | |
| Phone | `phone` | |
| Active Contracts | `active_contract_count` | **Red badge** |
| Listing IDs | `listing_ids` | Comma-separated, each links to `/listings/{id}` |

- Use a red/danger accent for this table — this is the **highest-confidence fraud signal**.
- If the array is empty, show a green "No concurrent tenants detected" message instead of an empty table.

#### 3c. Rent Outliers by Area

| Column | Key | Notes |
|---|---|---|
| Listing | `title` | Links to `/listings/{listing_id}` |
| Owner | `owner_name` | |
| Area | `area_name` | |
| Rent | `rent` | Format with Taka symbol |
| Area Avg | `area_avg_rent` | Format with Taka symbol, muted |
| Area Stddev | `area_stddev_rent` | Format as plus-minus, muted |
| Z-Score | `z_score` | **Color-coded**: >=3 = red, >=2 = amber |

- Header includes explanation tooltip: *"Listings whose rent deviates more than 2 standard deviations from their area's average."*
- Sorted by z-score descending (already from API).

#### 3d. Listings with No Photos

| Column | Key | Notes |
|---|---|---|
| Listing | `title` | Links to `/listings/{listing_id}` |
| Status | `status` | Status badge (waiting/approved) |
| Owner | `owner_name` | |
| Email | `owner_email` | |
| Area | `area_name` | |

- Simple table, no special formatting needed beyond the existing status badge pattern.

#### 3e. Duplicate Location Detection

| Column | Key | Notes |
|---|---|---|
| Listing A | `listing_1_title` | Links to `/listings/{listing_1_id}` |
| Owner A | `owner_1_name` | |
| Listing B | `listing_2_title` | Links to `/listings/{listing_2_id}` |
| Owner B | `owner_2_name` | |
| Area | `area_name` | |
| Distance | computed | Display approximate meters: `(lat_diff + lng_diff) * 111000` |

- Header includes explanation tooltip: *"Different owners listing properties within ~55m of each other."*
- If empty, show "No suspicious location duplicates found."

---

### 2.6 Section 4 — Action Button

A single prominent CTA button at the bottom of the page:

```tsx
<button
  onClick={() => navigate("/listings?view=pending")}
  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
>
  Review New Listings →
</button>
```

This navigates to the **existing** verifier review queue (the `ListingsPage` in pending mode). No new pages or modifications needed — the queue already works.

---

### 2.7 Navbar Link

Add a "Dashboard" link in the verifier section of `Navbar.tsx` (next to the existing "Review Queue" link), visible only when `user?.is_verifier`:

```tsx
{user?.is_verifier && (
  <Link to="/verify/dashboard" className="...">
    Dashboard
  </Link>
)}
```

---

## File Checklist

### New Files to Create

| # | File | Type | Purpose |
|---|---|---|---|
| 1 | `db/migrations/008_listing_created_at.sql` | SQL | Adds `created_at` column to `listings` |
| 2 | `server/src/services/dashboard.service.ts` | TypeScript | All 7 dashboard SQL queries |
| 3 | `server/src/controllers/dashboard.controller.ts` | TypeScript | Thin controller, calls service, returns JSON |
| 4 | `server/src/routes/dashboard.route.ts` | TypeScript | `GET /` with `authMiddleware` + `requireVerifier` |
| 5 | `client/src/pages/VerifierDashboardPage.tsx` | TSX | Full dashboard page with 4 sections |

### Existing Files That Need Minimal Edits

| # | File | Change |
|---|---|---|
| 1 | `server/src/index.ts` | Add 1 import + 1 `app.use("/api/dashboard", ...)` line |
| 2 | `client/src/App.tsx` | Add 1 import + 1 `<Route>` for `/verify/dashboard` |
| 3 | `client/src/components/Navbar.tsx` | Add 1 `<Link>` for Dashboard (verifier-only) |

---

## Verification Plan

After implementation, verify each section works:

1. **Migration**: Run `psql -f db/migrations/008_listing_created_at.sql` against the database.
2. **Backend smoke test**: `curl -H "Authorization: Bearer <verifier-token>" http://localhost:5000/api/dashboard` — should return the full JSON shape described in section 1.5.
3. **Frontend**: Log in as a verifier account, navigate to `/verify/dashboard`:
   - Confirm all 5 overview stat cards render with non-zero numbers.
   - Confirm the line chart renders (may show flat lines if less than 8 weeks of data).
   - Confirm each fraud table renders (may show "no results" messages if seed data is clean).
   - Confirm "Review New Listings" button navigates to `/listings?view=pending`.
4. **Access control**: Log in as a non-verifier (owner or tenant) and navigate to `/verify/dashboard` — should redirect to `/listings`.
5. **Unauthenticated**: `curl http://localhost:5000/api/dashboard` without a token — should return `401`.

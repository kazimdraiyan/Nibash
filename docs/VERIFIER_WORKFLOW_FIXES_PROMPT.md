# Specification & Prompt: Verifier Workflow Polish & UI Refinements

> **Task Type**: Frontend-Heavy Refinement with Minor Backend & SQL Enhancements  
> **Status**: Specification & Implementation Plan  
> **Target Files**:
> - `server/src/services/dashboard.service.ts` (Backend)
> - `db/migrations/009_contract_created_at.sql` (Database)
> - `client/src/components/Navbar.tsx` (Frontend)
> - `client/src/pages/VerifierDashboardPage.tsx` (Frontend)
> - `client/src/components/DocumentViewerModal.tsx` (Frontend)

---

## 1. Executive Summary of Changes

| Area | Current Behavior | Required Target Behavior |
|---|---|---|
| **Navbar Links** | "Dashboard" appears twice for verifiers: once in center navigation and once as a button on the right. | Remove redundant "Dashboard" button from the right action cluster. Keep clean, singular navigation hierarchy. |
| **Stats "Pending Review"** | Static, unclickable `<div>` display chip. | Clickable `<Link>` or navigation card redirecting directly to the Review Queue (`/listings?view=pending`) with luxury hover state. |
| **Section Headings** | Prefixed with "Section 1", "Section 2", "Section 3". | Clean, editorial titles matching Nibash luxury styling: "Platform Overview", "Growth Velocity", "Integrity & Risk Signals". |
| **Growth Trends Chart** | Vertically squashed (224px high box, 160px Y-range across 800px width). Only shows signups & listings. | Expanded height (`h-80 sm:h-96`, `viewBox="0 0 800 360"`, 240px vertical range). Add 3rd data series: **Signed Contracts** per week. |
| **Rent Outliers & SQL** | Displays confusing statistical jargon ("How this works", "CTE", "2-Sigma", "StdDev (σ)", "Z-Score"). Area average includes the outlier itself, skewing the comparison. | Remove all technical boxes, stddev, and z-score columns. Compute **Typical Market Rent** using a clean-pass SQL query averaging only **non-outlier** listings. |
| **Technical Language** | Accordions and subtitles contain database/algorithm jargon ("GPS Proximity Self-Join", "Anti-Join", "Automated Heuristics"). | Rewrite all card headers, subtitles, and badges into clean, high-end business and trust-and-safety terminology. |
| **Visual Aesthetics & Typography** | Standard dark theme with default monospace accents and generic borders. | Harmonize with Nibash landing page: Cormorant Garamond serif headers with `.silver-gradient-text`, `glass-panel` luxury cards, and `glass-panel-subtle` eyebrow pills with gold accents (`#d4b068`). |
| **Document Viewer Modal** | Cramped inside `max-w-5xl h-[85vh]` with `p-4` gutters and `max-h-[70vh]` image limit, making fine text on legal deeds and utility receipts illegible. | Full-dimension layout (`max-w-[96vw] h-[94vh]` with optional 100vw/100vh true fullscreen toggle), edge-to-edge media canvas, compact header/thumbnails, and zero clipping. |

---

## 2. Database & Backend Enhancements

### 2.1 Database Migration: `contracts.created_at`
To accurately plot signed contracts per week over the last 8 weeks in the growth chart, contracts require a creation timestamp (or fallback to `start_date`).

Create `db/migrations/009_contract_created_at.sql`:
```sql
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows with start_date if needed
UPDATE contracts SET created_at = start_date::timestamp WHERE created_at IS NULL;
```

---

### 2.2 Backend Service: `server/src/services/dashboard.service.ts`

#### A. Add `contracts_per_week` to Growth Trends
Update `GrowthTrends` interface and `getGrowthTrends()` query:

```typescript
export interface GrowthTrends {
  signups_per_week: GrowthTrendItem[];
  listings_per_week: GrowthTrendItem[];
  contracts_per_week: GrowthTrendItem[];
}

export async function getGrowthTrends(): Promise<GrowthTrends> {
  const signups = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                          AS count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at) ASC
  `);

  const newListings = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                          AS count
    FROM listings
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at) ASC
  `);

  const newContracts = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp)), 'YYYY-MM-DD') AS week,
      COUNT(*)::int                                                                           AS count
    FROM contracts
    WHERE COALESCE(created_at, start_date::timestamp) >= NOW() - INTERVAL '8 weeks'
      AND status = 'signed'
    GROUP BY DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp))
    ORDER BY DATE_TRUNC('week', COALESCE(created_at, start_date::timestamp)) ASC
  `);

  return {
    signups_per_week: signups.rows,
    listings_per_week: newListings.rows,
    contracts_per_week: newContracts.rows,
  };
}
```

---

#### B. Clean Rent Outlier Query (Averaging Non-Outliers Only)
Replace the statistical outlier query so that:
1. It detects outliers using standard deviation.
2. It re-averages **only the non-outlier properties** in that neighborhood to produce a realistic `typical_avg_rent`.
3. It drops raw `stddev_rent` and `z_score` from the returned fields to prevent technical leakage to the frontend.

```typescript
export interface RentOutlier {
  listing_id: number;
  title: string;
  owner_name: string;
  area_name: string;
  rent: number;
  typical_area_rent: number; // Clean average excluding the extreme listings
  difference_pct: number;    // Human percentage (+140% or -75%)
}

export async function getRentOutliers(): Promise<RentOutlier[]> {
  const result = await pool.query(`
    WITH area_stats AS (
      -- Step 1: Initial neighborhood baseline stats
      SELECT
        l.area_id,
        a.name                 AS area_name,
        AVG(t.rent)            AS initial_avg,
        STDDEV_POP(t.rent)     AS stddev_rent,
        COUNT(*)::int          AS listing_count
      FROM listings l
      JOIN initial_terms it ON it.listing_id = l.id
      JOIN terms t          ON t.id = it.terms_id
      JOIN areas a          ON a.id = l.area_id
      WHERE l.status NOT IN ('unavailable', 'rejected')
      GROUP BY l.area_id, a.name
      HAVING COUNT(*) >= 3
    ),
    clean_area_stats AS (
      -- Step 2: Re-average ONLY non-outlier properties in the neighborhood
      SELECT
        l.area_id,
        AVG(t.rent)            AS clean_avg_rent
      FROM listings l
      JOIN initial_terms it ON it.listing_id = l.id
      JOIN terms t          ON t.id = it.terms_id
      JOIN area_stats s     ON s.area_id = l.area_id
      WHERE l.status NOT IN ('unavailable', 'rejected')
        -- Keep listings that are within 2 standard deviations
        AND (s.stddev_rent = 0 OR ABS(t.rent - s.initial_avg) <= 2 * s.stddev_rent)
      GROUP BY l.area_id
    )
    SELECT
      l.id                                                       AS listing_id,
      l.title,
      u.name                                                     AS owner_name,
      s.area_name,
      t.rent::float                                              AS rent,
      ROUND(COALESCE(c.clean_avg_rent, s.initial_avg)::numeric, 0)::float AS typical_area_rent,
      ROUND(
        (((t.rent - COALESCE(c.clean_avg_rent, s.initial_avg)) / NULLIF(COALESCE(c.clean_avg_rent, s.initial_avg), 0)) * 100)::numeric,
        0
      )::int                                                     AS difference_pct
    FROM listings l
    JOIN initial_terms it   ON it.listing_id = l.id
    JOIN terms t            ON t.id = it.terms_id
    JOIN area_stats s       ON s.area_id = l.area_id
    LEFT JOIN clean_area_stats c ON c.area_id = l.area_id
    JOIN users u            ON u.id = l.owner_id
    WHERE ABS(t.rent - s.initial_avg) > 2 * s.stddev_rent
      AND s.stddev_rent > 0
      AND l.status NOT IN ('unavailable', 'rejected')
    ORDER BY ABS(t.rent - s.initial_avg) DESC;
  `);

  return result.rows;
}
```

---

## 3. Frontend Part 1: Navbar Simplification (`Navbar.tsx`)

### Problem
When logged in as a verifier, the header displays:
- Center Nav: `Dashboard`, `Review Queue`, `Catalog`
- Right Action Group: `[Dashboard]`, `[Review Queue]`, `ProfileMenu`

This duplicates the `Dashboard` and `Review Queue` links directly next to each other.

### Fix
1. Center Nav retains navigation links: `Dashboard`, `Review Queue`, `Catalog`.
2. Right Action Group removes the redundant `[Dashboard]` button.
3. Keep a single, high-contrast `[Review Queue]` button on the right with the verifier indicator, plus the `ProfileMenu`.

```tsx
{token ? (
  <div className="flex items-center gap-3">
    {user?.is_verifier ? (
      <Link
        to="/listings?view=pending"
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest font-label-sm transition-all border cursor-pointer ${
          location.pathname === "/listings" && location.search.includes("view=pending")
            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
            : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-white"
        }`}
      >
        <span className="material-symbols-outlined text-base text-amber-400">verified_user</span>
        <span>Review Queue</span>
      </Link>
    ) : (
      <>
        <Link to="/my-listings" ...>My Listings</Link>
        <Link to="/listings/new" ...>Post a Listing</Link>
      </>
    )}
    <ProfileMenu />
  </div>
) : ...
```

---

## 4. Frontend Part 2: Verifier Dashboard Overhaul (`VerifierDashboardPage.tsx`)

### 4.1 Typography & Brand Harmonization with Landing Page
Adopt Nibash luxury design tokens:
- **Headings**: `Cormorant Garamond` serif with `.silver-gradient-text`:
  ```tsx
  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight">
    Verifier Intelligence <span className="font-serif italic font-normal text-silver-gradient-text">Dashboard</span>
  </h1>
  ```
- **Eyebrow Pills**: Use landing page pill style:
  ```tsx
  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-2">
    <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
    <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
      Trust & Verification Portal
    </span>
  </div>
  ```
- **Cards**: Wrap sections and metric cards in `.glass-panel` or `bg-[#12151c] border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-white/20 transition-all`.
- **Numbers**: Display key statistics in `font-serif font-light text-3xl sm:text-4xl text-[#f8f9fa]`.

---

### 4.2 Clean Headings (Remove "Section N")
- Replace `Section 1 — Platform Overview` with:
  ```tsx
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <span className="material-symbols-outlined text-base text-blue-400">monitoring</span>
      <h2 className="text-xs uppercase tracking-widest font-label-sm text-slate-300 font-semibold">
        Platform Overview
      </h2>
    </div>
  </div>
  ```
- Replace `Section 2 — Platform Growth Velocity` with:
  ```tsx
  <div className="flex items-center gap-2.5">
    <span className="material-symbols-outlined text-base text-emerald-400">trending_up</span>
    <h2 className="text-xs uppercase tracking-widest font-label-sm text-slate-300 font-semibold">
      Platform Growth Trends
    </h2>
  </div>
  ```
- Replace `Section 3 — Fraud & Integrity Signals (Automated Heuristics)` with:
  ```tsx
  <div className="flex items-center gap-2.5">
    <span className="material-symbols-outlined text-base text-red-400">crisis_alert</span>
    <h2 className="text-xs uppercase tracking-widest font-label-sm text-red-400 font-semibold">
      Integrity & Risk Signals
    </h2>
  </div>
  ```

---

### 4.3 Clickable "Pending Review" Stat Card
Transform the static chip into an interactive callout card:
```tsx
<Link
  to="/listings?view=pending"
  className="bg-[#12151c]/80 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/50 rounded-2xl px-5 py-4 flex items-center justify-between transition-all group cursor-pointer shadow-sm hover:shadow-amber-500/10"
>
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
      <span className="material-symbols-outlined text-base">hourglass_top</span>
    </div>
    <div>
      <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors block">
        Pending Verification
      </span>
      <span className="text-[10px] text-amber-400 font-label-sm uppercase tracking-wider">
        Click to review queue →
      </span>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-lg font-serif font-bold text-amber-400 font-mono">
      {overview.listings_waiting}
    </span>
    <span className="material-symbols-outlined text-sm text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all">
      arrow_forward
    </span>
  </div>
</Link>
```

---

### 4.4 Fix Squeezed Graph & Add Contracts Series
1. **Vertical Space**: Change container height from `h-56` (224px) to `h-80 sm:h-96` (320px–384px).
2. **SVG ViewBox**: Change `viewBox="0 0 800 240"` to `viewBox="0 0 800 360"`.
3. **Y-Axis Range**: Expand Y-mapping from `160px` to `240px` (`y = 280 - (val / maxVal) * 230`).
4. **Triple Series**:
   - Blue (`#3b82f6`): User Registrations
   - Amber (`#f59e0b`): New Listings
   - Emerald (`#10b981`): Signed Leases / Contracts
5. **Legend**: Updated with 3 color markers.
6. **Data Synchronisation**:
   ```typescript
   const weekMap = new Map<string, { signups: number; listings: number; contracts: number }>();
   // Merge signups_per_week, listings_per_week, contracts_per_week into unified timeline
   ```

---

### 4.5 Clean Up Rent Outliers & Remove Technical Explanations
1. **Delete**: The `<p>` callout containing *"How this works: For each neighborhood with ≥3 listings, Nibash computes average rent and population standard deviation..."*.
2. **Delete**: The `StdDev (σ)` table column and header.
3. **Delete**: The `Z-Score` table column and header.
4. **Update Columns**:
   - `Property` (Title + ID)
   - `Neighborhood`
   - `Landlord`
   - `Listed Rent` (৳)
   - `Typical Market Rent` (৳ clean non-outlier average)
   - `Deviation` (e.g. `+145% Above Market` in amber/red pill)
   - `Action` (Inspect link)
5. **Remove Technical Jargon Across Sub-Sections**:
   - Subtitle for Duplicates: *"Properties registered at identical or overlapping geographic coordinates"* (Remove `GPS Proximity Self-Join (|Δlat| < 0.0005°...)`).
   - Remove the *"Proximity Logic: Flags distinct owners claiming coordinates..."* callout box.
   - Subtitle for Concurrent Leases: *"Tenants holding active lease agreements on multiple properties simultaneously"* (Remove `High-Confidence Anomaly`).
   - Subtitle for Owner Portfolios: *"Landlords ordered by number of registered properties"*.
   - Subtitle for Photo-less Listings: *"Listings submitted without any property photographs"* (Remove `Anti-Join LEFT JOIN`).

---

## 5. Frontend Part 3: Full-Screen Document Viewer (`DocumentViewerModal.tsx`)

### Problem
Legal deeds, water bill receipts, and tax certificates contain dense text that becomes unreadable when constrained to `max-w-5xl h-[85vh]` with `p-4` inner gutters and `max-h-[70vh]` image caps.

### Fix
1. **Expanded Dimensions**:
   - Increase default modal size: `w-full max-w-[96vw] xl:max-w-[1400px] h-[94vh] rounded-3xl`.
2. **True Fullscreen Mode**:
   - Add state: `const [isFullscreen, setIsFullscreen] = useState(false);`
   - When fullscreen is toggled: modal adopts `fixed inset-0 w-screen h-screen rounded-none z-[100] max-w-none`.
   - Add a Fullscreen Toggle button in the header (`fullscreen` / `fullscreen_exit` icons).
3. **Zero-Padding Media Canvas**:
   - Content container padding changed from `p-4` to `p-1 sm:p-2`.
   - For images: `className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"` without the artificial `max-h-[70vh]` cap.
   - For PDFs: `iframe` expands to `100%` width and height without internal scroll clipping.
4. **Streamlined Header & Footer**:
   - Header padding reduced to `px-6 py-2.5` to prioritize media viewing height.
   - Thumbnails row reduced to `py-2` with compact previews.

---

## 6. Implementation Checklist

- [ ] **Step 1: DB Migration**
  - Create and apply `db/migrations/009_contract_created_at.sql`.
- [ ] **Step 2: Backend Service Updates**
  - Update `GrowthTrends` & `RentOutlier` interfaces in `dashboard.service.ts`.
  - Add weekly signed contracts query to `getGrowthTrends()`.
  - Rewrite `getRentOutliers()` query with two-pass CTE to average non-outliers only.
- [ ] **Step 3: Navbar Fix**
  - Remove duplicate `Dashboard` button from the right side of `Navbar.tsx`.
- [ ] **Step 4: Dashboard UI & Jargon Cleanup**
  - Remove "Section" from headings in `VerifierDashboardPage.tsx`.
  - Delete technical explanation callouts and CTE/StdDev/Z-score references.
  - Simplify rent outliers table columns to show clean `Typical Market Rent` and `% Deviation`.
  - Clean up all fraud accordion subtitles.
  - Make "Pending Review" card an interactive link to `/listings?view=pending`.
  - Expand SVG chart height (`h-96`, `viewBox="0 0 800 360"`), add signed contracts series.
  - Apply Cormorant Garamond serif headings, `.silver-gradient-text`, and `.glass-panel` cards.
- [ ] **Step 5: Document Viewer Spacing & Fullscreen**
  - Update `DocumentViewerModal.tsx` with `max-w-[96vw] h-[94vh]`, edge-to-edge media canvas, and fullscreen toggle.
- [ ] **Step 6: Verification & AST Update**
  - Run `npm run --prefix server build` and `npm run --prefix client build`.
  - Run `graphify update .`.

---

## 7. Verification Plan

1. **Compilation**: Both server (`tsc`) and client (`vite build`) compile with 0 TypeScript/syntax errors.
2. **Growth Chart**: Verify the SVG chart renders 3 distinct lines (Signups, Listings, Contracts) with proportional vertical height without squeezing.
3. **Rent Outliers**: Verify the table displays only clean, human-readable numbers (Listed Rent vs. Typical Market Rent) without technical jargon.
4. **Navigation**: Verify clicking "Pending Review" opens `/listings?view=pending`, and Navbar shows no duplicate Dashboard links.
5. **Document Viewer**: Open a document on a listing detail page and verify the media fills the viewport cleanly, with the fullscreen toggle functioning properly.

# Nibash

**A verified apartment rental marketplace for Bangladesh.**

Course project for **CSE216: Database Systems** - a PERN-stack platform where owners list verified properties, tenants search and apply with multi-filter queries, and the system tracks leases, rent payments, reviews, and fraud signals through explicit SQL, triggers, and audit trails.

**Demo video:** [Add your YouTube or Drive link here](https://example.com/nibash-demo)

**ERD:** [db/ERD.pdf](db/ERD.pdf)

---

## Presentation checklist

- [x] Introductory slide — [Add link to your slide deck or PDF here](https://example.com/nibash-intro-slide)

---

## Table of contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [Tech stack](#tech-stack)
4. [How to install](#how-to-install)
5. [Folder structure](#folder-structure)
6. [Known issues](#known-issues)
7. [Future plans](#future-plans)
8. [What we learned](#what-we-learned-from-this-project)
9. [Frontend LLM usage](#frontend-llm-usage)
10. [Contribution guidelines](#contribution-guidelines)
11. [Credits](#credits)
12. [FAQ](#faq)
13. [License](#license)

---

## Features

### For tenants

- Register and authenticate with JWT-based sessions
- Search listings with natural-language queries, filters (bedrooms, bathrooms, floor, rent, area, amenities, pets), full-text search, and fuzzy area matching
- View listing details with image galleries, maps (Google Maps), amenities, and rent breakdown
- Star/save favorite listings
- Submit rental applications and track application status
- Sign digital lease contracts and view active contract details
- Pay rent (ledger tracked in PostgreSQL) and leave post-payment reviews

### For owners

- Create and manage listings with photos, terms (rent, utilities, deposit, pet policy), and location
- Upload ownership/verification documents (deed receipts, tax bills, NID, etc.)
- Review incoming tenant applications
- Propose and manage lease contracts
- View rental income analytics (overall, per-listing, per-contract) with date-range filters
- Access tenant history for a listing

### For verifiers (admins)

- Dedicated verifier portal and dashboard
- Review flagged/waiting listings and uploaded documents
- Platform analytics: growth trends, rent outliers, duplicate-location detection, owners by listing count, concurrent tenants

### Database and backend highlights

- Hand-rolled auth (bcrypt + JWT) with token revocation
- Role-based access control on every protected route (owner, tenant, verifier)
- Raw `pg` driver — no ORM; explicit SQL and `BEGIN` / `COMMIT` / `ROLLBACK` transactions
- PostgreSQL triggers for role separation, listing status sync, review eligibility, and data integrity
- Stored procedures for monthly payment generation and overdue marking (`pg_cron`)
- Full-text search (`tsvector`, `websearch_to_tsquery`) with `pg_trgm` fallback for typos
- Advanced analytics queries: CTE-based rent outlier detection, income aggregation with `FILTER`, weekly growth trends
- Document and image storage via Supabase Storage
- Server-side validation with Zod schemas on all major endpoints
- Scheduled jobs (node-cron) for contract completion and token cleanup

---

## Screenshots

Add screenshots to a `docs/screenshots/` folder, then update the paths below.

| Screen | Description |
|--------|-------------|
| Home / Hero | Landing page with search carousel and featured listings |
| Listings search | Filtered search results with map and cards |
| Listing detail | Gallery, terms, apply flow, and document upload |
| Owner dashboard | My listings, applications, and income page |
| Verifier dashboard | Platform overview and flagged listings |
| Contract flow | Contract creation, signing, and payment ledger |

Example markup once images exist:

```markdown
![Home page](docs/screenshots/home.png)
![Listing search](docs/screenshots/search.png)
![Listing detail](docs/screenshots/listing-detail.png)
![Verifier dashboard](docs/screenshots/verifier-dashboard.png)
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL 15+ (triggers, procedures, `pg_cron`, `pg_trgm`, full-text search) |
| Backend | Node.js, Express 5, TypeScript, `pg`, Zod, bcrypt, jsonwebtoken, multer, node-cron |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, GSAP |
| Maps | Google Maps JavaScript API |
| Storage | Supabase Storage (listing images and documents) |
| Testing | Node.js built-in test runner (`tsx --test`) |

**Architecture:** PERN (PostgreSQL, Express, React, Node.js) with a JSON REST API between client and server.

---

## How to install

### Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL 15+
- npm
- Supabase project (for media uploads)
- Google Maps API key (for map components)

### 1. Clone the repository

```bash
git clone https://github.com/kazimdraiyan/Nibash.git
cd nibash
```

### 2. Set up the database

```bash
createdb nibash
```

Apply migrations in order:

```bash
psql -d nibash -f db/migrations/001_users_and_areas.sql
psql -d nibash -f db/migrations/002_buildings_and_listings.sql
psql -d nibash -f db/migrations/003_applications_and_leases.sql
psql -d nibash -f db/migrations/004_payments_and_reviews.sql
psql -d nibash -f db/migrations/005_triggers.sql
psql -d nibash -f db/migrations/006_revoked_tokens.sql
psql -d nibash -f db/migrations/007_prevent_occupied_listing_deletion.sql
psql -d nibash -f db/migrations/008_listing_created_at.sql
psql -d nibash -f db/migrations/009_contract_created_at.sql
psql -d nibash -f db/migrations/010_make_terms_optional.sql
psql -d nibash -f db/migrations/011_payment_procedure.sql
psql -d nibash -f db/migrations/012_rental_income_indexes.sql
psql -d nibash -f db/migrations/013_search_infrastructure.sql
psql -d nibash -f db/seed.sql
```

> **Note:** Migration `011` uses `pg_cron`. Install the extension in PostgreSQL if it is not already available.

### 3. Configure environment variables

Create `server/.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/nibash
JWT_SECRET=your-hmac-secret
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Create `client/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_MAPS_MAP_ID=your-map-id
```

### 4. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 5. Run the application

```bash
# Terminal 1 — backend (from /server)
npm run dev

# Terminal 2 — frontend (from /client)
npm run dev
```

- Backend: `http://localhost:5000` (health check at `/health`)
- Frontend: `http://localhost:5173` (default Vite port)

### 6. Run tests (optional)

```bash
cd server
npm test
```

---

## Folder structure

```
nibash/
├── client/                    # React (Vite) frontend
│   ├── src/
│   │   ├── api/               # REST client helpers
│   │   ├── components/        # Shared UI (Navbar, Hero, modals, etc.)
│   │   ├── context/           # AuthContext
│   │   ├── pages/             # Route-level pages
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Helpers (amenities, area lookup)
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── cron/              # Scheduled jobs
│   │   ├── db/                # pg connection pool
│   │   ├── errors/            # AppError class
│   │   ├── middleware/        # Auth, RBAC, upload, rate limiting
│   │   ├── routes/            # API route definitions
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── services/          # Business logic and SQL queries
│   │   │   └── search/        # Full-text + fuzzy search
│   │   └── scripts/           # Utility scripts (e.g. createVerifier)
│   └── package.json
├── db/
│   ├── ERD.pdf                # Entity-relationship diagram
│   ├── schema.txt             # Human-readable schema summary
│   ├── migrations/            # Ordered SQL migration files (001–013)
│   └── seed.sql               # Amenity and reference data
├── docs/
│   └── features/              # Feature documentation
└── README.md
```

---

## Known issues

- **Monthly payment cron is partially disabled.** The `generate_monthly_payments()` procedure exists, but its `pg_cron` schedule is commented out in `011_payment_procedure.sql`. Only the overdue-payment job runs on a daily schedule.
- **Contract completion has no notifications.** The midnight cron marks expired contracts as `completed` but does not yet send email alerts (see TODO in `server/src/cron/jobs.ts`).
- **Real payment gateways are not integrated.** bKash and SSLCommerz transaction ID columns exist in the schema, but live payment processing is simulated/stubbed.
- **AI document extraction is planned, not implemented.** Ownership document upload works; automated field extraction from deeds/receipts is still on the roadmap.
- **No dedicated screenshot or deployment docs yet.** Local setup requires manual `.env` configuration for Supabase and Google Maps.

---

## Future plans

- AI-assisted Dolil/tax-receipt field extraction via a multimodal vision API
- bKash/Nagad sandbox integration for wallet-based identity verification
- Computed owner trust score from reviews, payment history, and verification status
- Email/SMS notifications for applications, contract milestones, and overdue rent
- Enable full monthly payment generation via `pg_cron`
- Production deployment (Docker, CI/CD, hosted PostgreSQL)
- Mobile-responsive PWA or native companion app

---

## What we learned from this project

### Backend

- Designing a REST API around explicit domain services (listings, contracts, payments, income) keeps SQL testable and separate from HTTP concerns.
- JWT auth is straightforward to implement, but token revocation and role checks must be enforced on every protected route — middleware alone is not enough without consistent service-layer authorization.
- Multi-step writes (create listing + terms + media + documents) require disciplined transaction boundaries; partial commits are worse than rolled-back failures.
- Cron jobs and stored procedures belong in the database when the logic is inherently temporal (rent cycles, overdue status), but application-level cron is fine for simpler housekeeping.

### Validation

- Zod schemas at the API boundary catch bad input before it hits SQL and produce consistent error messages.
- Validation should be layered: HTTP schema validation, service-level business rules, and database constraints/triggers as the last line of defense.
- Geographic coordinates, rent amounts, and date ranges need explicit bounds — silent coercion leads to bad listings and broken search.

### Database: from project requirement to ERD

- We started from the course requirement (rental marketplace with trust/fraud signals) and modeled entities around real Bangladesh rental workflows: areas, listings, terms, applications, contracts, payments, reviews, and verifier documents.
- The ERD ([db/ERD.pdf](db/ERD.pdf)) drove table design before any application code — role tables (`owners`, `tenants`, `verifiers`) as extensions of `users` kept RBAC normalized.
- Iterating the schema through numbered migrations (`001`–`013`) taught us that production databases evolve; triggers and denormalized columns (`rent`, `pet_allowed`, `search_document`) were added only after query patterns were understood.

### Advanced queries

- **Full-text search:** weighted `tsvector` documents with `websearch_to_tsquery('simple', ...)` plus `pg_trgm` fallback for typo-tolerant area names.
- **Income analytics:** multi-table joins with `FILTER`, `COALESCE`, and dynamic date-range predicates for owner dashboards.
- **Rent outlier detection:** two-step CTE — compute area mean/stddev, then re-average excluding outliers before flagging listings beyond 2 standard deviations.
- **Fraud/anomaly signals:** duplicate-location queries, concurrent-tenant detection (`HAVING COUNT > 1`), and listings without photos for verifier review.
- **Stored procedures:** `generate_monthly_payments()` and `mark_overdue_payments()` encapsulate recurring billing logic close to the data.

---

## Frontend LLM usage

The React frontend was developed with **LLM-assisted workflows** (Cursor and similar tools). LLMs were used to:

- Scaffold and refine UI components (Hero carousel, glass-morphism panels, responsive layouts)
- Generate Tailwind CSS styling and GSAP animation patterns
- Iterate on page structure for listing detail, contracts, and the About Us page
- Speed up boilerplate for forms, modals, and route wiring

The backend, SQL migrations, triggers, stored procedures, and Zod validation schemas were written and reviewed manually to meet course database requirements. The co-founders acknowledge this split on the About page ("Just prompt it.") — LLMs accelerated frontend delivery; database correctness remained a first-class, hand-engineered concern.

If you extend the project, treat LLM output as a draft: review accessibility, API contracts, and security before merging.

---

## Contribution guidelines

1. **Fork and branch.** Create a feature branch from `main` (e.g. `feature/search-improvements`).
2. **Follow existing conventions.** TypeScript on both client and server; Zod for API input; raw SQL in services, not in controllers.
3. **Database changes.** Add a new numbered migration under `db/migrations/` — do not edit old migrations in place.
4. **Test backend changes.** Run `npm test` in `server/` and add tests for new service logic where practical.
5. **Keep commits focused.** One logical change per commit with a clear message.
6. **No secrets in git.** Never commit `.env` files, Supabase keys, or JWT secrets.
7. **Pull requests.** Describe what changed, how to test it, and link any related issue. Include screenshots for UI changes.

---

## Credits

**Course:** CSE216 — Database Systems

**Team:**

| Name | Student ID | GitHub |
|------|------------|--------|
| Abid Hossain | 2405114 | [abidghumay](https://github.com/abidghumay/) |
| Kazi Md Raiyan | 2405103 | [kazimdraiyan](https://github.com/kazimdraiyan/) |

**Repository:** [https://github.com/kazimdraiyan/Nibash](https://github.com/kazimdraiyan/Nibash)

**Assets:** Team photos and branding in `client/src/assets/developers/`.

---

## FAQ

**What is Nibash?**  
A verified apartment rental platform focused on the Bangladesh market — reducing broker dependency, ghost listings, and untraceable payments.

**Who can use the app?**  
Three roles: **tenants** (search and apply), **owners** (list and manage properties), and **verifiers** (review documents and flagged listings).

**Why no ORM?**  
This is a database course project. Using the raw `pg` driver forces explicit SQL, transactions, triggers, and query optimization — which is the learning goal.

**How do I create a verifier account?**  
Use the utility script: `server/src/scripts/createVerifier.ts` (run via `tsx` after the database is seeded).

**Does real bKash payment work?**  
Not yet. Payment records and transaction ID columns exist for future integration; current flows simulate confirmation.

**Why does search use `'simple'` text config instead of English?**  
Bangladeshi area names (e.g. Mirpur, Uttara) are not English stems. `'simple'` avoids aggressive stemming that would break local place-name matching.

**Can I run the app without Supabase?**  
Listing creation and image upload require Supabase Storage credentials. Other features work with PostgreSQL and JWT config alone.

**Is the frontend production-ready?**  
The UI is functional and polished for demo purposes. Hardening (error boundaries, full E2E tests, deployment config) is planned.

**How do I report a bug?**  
Open a GitHub issue with steps to reproduce, expected vs actual behavior, and relevant logs.

---

## License

TBD

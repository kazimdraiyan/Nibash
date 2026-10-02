# Nibash

**A apartment rental marketplace for Bangladesh with fraud detection.**

Course project for **CSE216: Database Systems** - a PERN-stack platform where owners list verified apartments, tenants search and apply with multi-filter queries, and the system tracks leases, rent payments, reviews, and fraud signals through explicit SQL.

[Watch Demo on YouTube](https://example.com/nibash-demo)

[Entity Relationship Diagram (ERD)](db/ERD.pdf)

## Table of contents

1. [Features](#features)
2. [Screenshots](#screenshots)
3. [Tech stack](#tech-stack)
4. [How to install](#how-to-install)
5. [Folder structure](#folder-structure)
6. [Known issues](#known-issues)
7. [Future plans](#future-plans)
8. [What we learned](#what-we-learned-from-this-project)
9. [LLM usage](#llm-usage)
10. [Contribution guidelines](#contribution-guidelines)
11. [Credits](#credits)
12. [FAQ](#faq)

---

## Features

### For tenants

- Register and authenticate with JWT-based sessions
- Search listings with keywords and filters (bedrooms, bathrooms, floor, rent, area, amenities)
- View listing details with image galleries, maps (Google Maps), amenities, and rent breakdown
- Star favorite listings
- Submit rental applications and track application status
- Sign digital lease contracts and view active contract details
- Pay rent and view payment history
- Rate and review listings

### For owners

- Create and manage listings with photos, terms (rent, utilities, deposit, etc.), and location
- Upload ownership/verification documents (deed receipts, tax bills, NID, etc.)
- Review incoming tenant applications
- Propose and manage lease contracts
- View rental income analytics (overall, per-listing, per-contract) with date-range filters
- Access tenant history for a listing

### For verifiers

- Dedicated verifier portal and dashboard
- Review flagged/waiting listings and uploaded documents
- Platform analytics: growth trends, rent outliers, duplicate-location detection, etc.

### Database and backend highlights

- Hand-rolled auth (bcrypt + JWT) with token revocation
- Role-based access control on every protected route (owner, tenant, verifier)
- No ORM was used; all queries are explicit SQL
- PostgreSQL triggers for data integrity
- Stored procedures for monthly payment generation and overdue marking (`pg_cron`)
- Full-text search (`tsvector`, `websearch_to_tsquery`) with `pg_trgm` fallback for typos
- Advanced analytics queries: CTE-based rent outlier detection, income aggregation with `FILTER`, weekly growth trends
- Document and image storage via Supabase Storage
- Server-side validation with Zod schemas on all major endpoints
- Scheduled jobs (node-cron) for contract completion and token cleanup

---

## Screenshots

<table>
    <tr>
        <td><img src="screenshots/home.png" alt="Home page" /></td>
        <td><img src="screenshots/search.png" alt="Listing search" /></td>
    </tr>
    <tr>
        <td><img src="screenshots/listingDetails.png" alt="Listing detail" /></td>
        <td><img src="screenshots/ownerDashboard.png" alt="Owner dashboard" /></td>
    </tr>
    <tr>
        <td><img src="screenshots/verifierDashboard.png" alt="Verifier dashboard" /></td>
        <td><img src="screenshots/fraudDetection.png" alt="Fraud detection" /></td>
    </tr>
</table>

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Database | PostgreSQL 15+ (triggers, procedures, `pg_cron`, `pg_trgm`, full-text search) |
| Backend | Node.js, Express 5, TypeScript, `pg`, Zod, bcrypt, jsonwebtoken, multer, node-cron |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4 |
| Maps | Google Maps JavaScript API |
| Storage | Supabase Storage (listing images, documents, and review media) |

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
# Terminal 1 - backend (from /server)
npm run dev

# Terminal 2 - frontend (from /client)
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173` (default Vite port)

---

## Folder structure

```
nibash/
├── client/                    # React (Vite) frontend
│   ├── src/
│   │   ├── api/               # REST client helpers
│   │   ├── components/        # Shared UI
│   │   ├── context/           # AuthContext
│   │   ├── pages/             # Route-level pages
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Helpers
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── cron/              # Scheduled jobs
│   │   ├── db/                # pg connection pool
│   │   ├── errors/            # AppError class
│   │   ├── middleware/        # Auth and validation middleware
│   │   ├── routes/            # API route definitions
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── services/          # Business logic and SQL queries
│   │   └── scripts/           # Utility scripts (e.g. createVerifier)
│   └── package.json
├── db/
│   ├── ERD.pdf                # Entity-relationship diagram
│   ├── schema.txt             # Human-readable schema summary
│   ├── migrations/            # Ordered SQL migration files (001–013)
│   └── seed.sql               # Amenity and reference data
└── README.md
```

---

## Known issues

- **Contract completion has no notifications.** The midnight cron marks expired contracts as `completed` but does not yet send email alerts.
- **Real payment gateways are not integrated.** bKash and SSLCommerz transaction ID columns exist in the schema, but live payment processing is not implemented.

---

## Future plans

- AI-assisted listing document verification
- bKash/SSLCommerz sandbox integration for wallet-based identity verification
- Computed owner trust score from reviews, payment history, and verification status
- Email/SMS notifications for applications, contract milestones, and overdue rent

---

## What we learned from this project

- Designing a REST API
- Cron jobs
- Layered validation: HTTP schema validation, service-level business rules, and database constraints/triggers as the last line of defense.
- Converting a application requirement into a normalized relational schema
- Advanced queries

---

## LLM usage

The React frontend was developed with LLM-assisted workflows.

---

## Contribution guidelines

1. **Fork and branch.** Create a feature branch from `main` (e.g. `feature/search-improvements`).
2. **Follow existing conventions.** TypeScript on both client and server; Zod for API input; raw SQL in services.
3. **Database changes.** Add a new numbered migration under `db/migrations/` - do not edit old migrations in place.
4. **Keep commits focused.** One logical change per commit with a clear message.
5. **Pull requests.** Describe what changed, how to test it, and link any related issue. Include screenshots for UI changes.

---

## Credits

**Course:** CSE216 — Database Systems

**Supervisor:** [Dr. Abu Sayed Md. Latiful Hoque](https://cse.buet.ac.bd/faculty/faculty_detail/asmlatifulhoque)

**Team:**

| Name           | Student ID | GitHub                                           |
|----------------|------------|--------------------------------------------------|
| Abid Hossain   | 2405114    | [abidghumay](https://github.com/abidghumay/)     |
| Kazi Md Raiyan | 2405103    | [kazimdraiyan](https://github.com/kazimdraiyan/) |

---

## FAQ

**Why no ORM?**  
This is a database course project. Using the raw `pg` driver forces explicit SQL, transactions, triggers, and query optimization, which is the learning goal.

**How do I create a verifier account?**  
Use the utility script: `server/src/scripts/createVerifier.ts` (run via `tsx` after the database is seeded).

**Can I run the app without Supabase?**  
Listing creation and image upload require Supabase Storage credentials. Other features work with PostgreSQL and JWT config alone.

**How do I report a bug?**  
Open a GitHub issue with steps to reproduce, expected vs actual behavior, and relevant logs.

---

Don't forget to drop a star!

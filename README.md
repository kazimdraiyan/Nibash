# Nibash

A Verified Apartment Rental Marketplace

Project for CSE216: Database Systems

## Overview

Renting an apartment in Bangladesh almost always runs through a broker, an advance payment handed over before anything is verified, and listings that may already be taken. Nibash treats this as a data and trust problem: landlords list apartments, tenants search and apply across multiple filters, and the system layers in fraud-detection signals, an explicit rent-payment ledger, and audit logging so that every sensitive action is traceable.

## Tech Stack (PERN)

- **P - PostgreSQL**: relational database
- **E - Express**: Node.js backend framework, using the raw `pg` driver (no ORM) so every query and transaction is explicit SQL
- **R - React**: frontend, built with Vite, communicating with the backend over a JSON REST API
- **N - Node.js**: JavaScript runtime for the backend

**Planned:** free-tier multimodal AI API for deed/receipt document extraction; bKash sandbox API for simulated wallet-based identity verification.

## User Roles

- **Landlord** - lists properties, manages applications, signs leases
- **Tenant** - searches listings, applies, manages an active lease and rent payments
- **Admin / Verifier** - reviews flagged listings and confirms ownership documents

## Core Features

- Hand-rolled authentication (custom password hashing + session/JWT issuance and verification)
- Server-side role-based access control enforced on every protected request
- Dimensional listing schema (Area → Building → PropertyType → Amenity) with multi-filter search
- Landlord and Tenant profiles; rental application / viewing-request workflow
- Lease creation, recurring rent ledger, and security deposit lifecycle (held → deducted → refunded)
- Reviews of buildings/landlords after a completed lease
- Duplicate-listing detection trigger (same address/Khatian number claimed by two accounts)
- Audit/shadow-logging trigger for sensitive status changes
- Report-threshold auto-flagging trigger for repeatedly reported listings
- Explicit `BEGIN ... COMMIT` / `ROLLBACK` transaction control on every multi-step DML operation

### Planned

- AI-assisted Dolil/tax-receipt field extraction (vision-model API)
- Mobile-wallet (bKash/Nagad sandbox) payment-based identity cross-check
- Computed landlord "trust score"

## Getting Started

### Prerequisites

- Node.js (LTS)
- PostgreSQL
- npm

### Project Structure

```
nibash/
├── client/          # React (Vite) frontend
├── server/          # Express backend (raw pg, no ORM)
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/   # auth + RBAC checks
│   │   ├── db/           # pg pool, queries, migrations
│   │   └── triggers/     # SQL trigger definitions
│   └── package.json
├── db/
│   └── schema.sql   # PostgreSQL schema, triggers, seed data
└── README.md
```

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/kazimdraiyan/Nibash.git
   cd nibash
   ```

2. **Set up PostgreSQL**

   ```bash
   createdb nibash
   psql -d nibash -f db/schema.sql
   ```

3. **Configure environment variables**

   Create a `.env` file in `server/`:

   ```
   DATABASE_URL=postgres://user:password@localhost:5432/nibash
   JWT_SECRET=your-hmac-secret
   PORT=5000
   ```

4. **Install dependencies**

   ```bash
   cd server
   npm install express pg cors dotenv
   npm install -D nodemon

   cd ../client
   npm install
   ```

5. **Run the app**

   ```bash
   # Backend (from /server)
   npm run dev

   # Frontend (from /client)
   npm run dev
   ```

## License

TBD

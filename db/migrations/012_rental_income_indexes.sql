-- Migration: 012_rental_income_indexes.sql
-- Description: Ensure payments columns exist and add performance indexes for rental income aggregation

-- 1. Ensure columns exist (defensive against partial legacy execution)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_month date;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date date;

-- 2. Indexes for fast aggregation by contract, owner, and date
CREATE INDEX IF NOT EXISTS idx_payments_contract_status ON payments(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_status_paid_at ON payments(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_contracts_listing_status ON contracts(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);

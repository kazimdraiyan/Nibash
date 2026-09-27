ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows with start_date if needed
UPDATE contracts SET created_at = start_date::timestamp WHERE created_at IS NULL;

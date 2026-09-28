-- Migration: 010_make_terms_optional.sql
-- Description: Make all terms attributes nullable except rent

ALTER TABLE terms ALTER COLUMN electricity_bill DROP NOT NULL;
ALTER TABLE terms ALTER COLUMN water_bill DROP NOT NULL;
ALTER TABLE terms ALTER COLUMN service_charge DROP NOT NULL;
ALTER TABLE terms ALTER COLUMN monthly_due_date DROP NOT NULL;
ALTER TABLE terms ALTER COLUMN pet_allowed DROP NOT NULL;
ALTER TABLE terms ALTER COLUMN security_deposit DROP NOT NULL;

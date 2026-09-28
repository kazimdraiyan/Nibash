-- ALTER TABLE Payments
--   ADD COLUMN IF NOT EXISTS billing_month date,
--   ADD COLUMN IF NOT EXISTS due_date date;

-- -- Pending payments have no payment time or method yet
-- ALTER TABLE Payments
--   ALTER COLUMN paid_at DROP NOT NULL,
--   ALTER COLUMN payment_method DROP NOT NULL;

-- ALTER TABLE Payments
--   ADD CONSTRAINT uq_payment_contract_month UNIQUE (contract_id, billing_month);

-- Insert a payment for each active contract every month
CREATE OR REPLACE PROCEDURE generate_monthly_payments()
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO Payments (contract_id, amount, status, billing_month, due_date)
  SELECT
    c.id,
    t.rent
      + COALESCE(t.electricity_bill, 0)
      + COALESCE(t.water_bill, 0)
      + COALESCE(t.service_charge, 0),
    'pending',
    date_trunc('month', CURRENT_DATE)::date, -- billing month is the first day of the current month
    (date_trunc('month', CURRENT_DATE)
       + (LEAST(t.monthly_due_date, 28) - 1) * interval '1 day')::date -- due date is the monthly due date of the contract
  FROM Contracts c
  JOIN Agreements a ON a.terms_id = c.agreement_id
  JOIN Terms t      ON t.id = a.terms_id
  WHERE c.status = 'active'
    AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
  ON CONFLICT (contract_id, billing_month) DO NOTHING;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 1st of every month at 00:00 UTC
-- SELECT cron.schedule('monthly-payments', '0 0 1 * *',
--                      $$CALL generate_monthly_payments()$$);

-- Corporation-setup companies were seeded with submitted_steps = 1 before Add Company
-- step 1; resume should start at wizard step 1 (index 0).
UPDATE corporation_companies
SET submitted_steps = 0
WHERE deleted_at IS NULL
  AND status = 'INCOMPLETE'
  AND submitted_steps = 1
  AND plan_id IS NOT NULL;

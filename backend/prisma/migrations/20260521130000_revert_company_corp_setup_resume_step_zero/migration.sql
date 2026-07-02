-- Revert 20260521120000_company_corp_setup_resume_step_zero: restore submitted_steps = 1
-- for corporation-setup companies that were set to 0 for add-company resume indexing.
UPDATE corporation_companies
SET submitted_steps = 1
WHERE deleted_at IS NULL
  AND status = 'INCOMPLETE'
  AND submitted_steps = 0
  AND plan_id IS NOT NULL;

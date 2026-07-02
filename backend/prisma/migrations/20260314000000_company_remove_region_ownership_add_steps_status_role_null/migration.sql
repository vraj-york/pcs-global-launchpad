-- Remove region/ownership from company (inherited from corporation in Step 1 form).
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "ownership_type";
ALTER TABLE "corporation_companies" DROP COLUMN IF EXISTS "data_residency_region";

-- Add company setup progress fields (mandatory; defaults for existing rows and safety).
ALTER TABLE "corporation_companies" ADD COLUMN "submitted_steps" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "corporation_companies" ADD COLUMN "status" VARCHAR(255) NOT NULL DEFAULT 'INCOMPLETE';

-- role optional in Add Company form (mandatory in quick/advance corporation setup).
ALTER TABLE "corporation_companies" ALTER COLUMN "role" DROP NOT NULL;

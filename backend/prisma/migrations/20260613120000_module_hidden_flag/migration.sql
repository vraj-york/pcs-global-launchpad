-- Add hidden flag for modules excluded from non–Super Admin role permission grids.
ALTER TABLE "modules" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

UPDATE "modules"
SET "hidden" = true
WHERE "name" IN (
  'Roles & Permissions',
  'Corporation Directory',
  'Company Directory',
  'Plan & Pricing',
  'Promo Code Management'
);

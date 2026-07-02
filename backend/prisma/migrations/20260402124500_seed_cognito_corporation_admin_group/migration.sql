-- Seed Cognito pool group catalog (name must match Cognito User Pool group exactly).
-- `id` must be set explicitly: migration 20260324130507 dropped the column default on `id`.
INSERT INTO "cognito_user_groups" ("id", "name", "description", "created_at", "updated_at")
VALUES
  ((gen_random_uuid())::text, 'CorporationAdmin', 'Cognito CorporationAdmin pool group', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

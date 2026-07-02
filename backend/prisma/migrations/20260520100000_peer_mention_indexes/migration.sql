-- Migration: peer_mention_indexes
--
-- These indexes target the two hot paths for the peer-mention feature:
--
--   1. Autocomplete  GET /users/me/peer-mentions?query=…
--      WHERE deleted_at IS NULL AND status ILIKE 'Active'
--      ORDER BY first_name ASC, last_name ASC, user_code ASC
--      LIMIT 10
--
--   2. Resolve  POST /users/me/peer-mentions/resolve
--      Same base filter + cognitoSub IN (…)
--
-- The user_company_access table already has:
--   UNIQUE (user_id, company_id)  ← covers EXISTS(user_id) lookups
--   INDEX (company_id)            ← covers EXISTS(company_id) lookups
-- so no new UCA index is required.

-- Partial index on app_users for the "active peer" filter + sort.
-- Covers: WHERE status ILIKE 'Active' AND deleted_at IS NULL
-- plus the ORDER BY (first_name, last_name, user_code) used in autocomplete.
CREATE INDEX IF NOT EXISTS idx_app_users_active_name
  ON app_users (first_name ASC, last_name ASC, user_code ASC)
  WHERE deleted_at IS NULL
    AND status ILIKE 'Active';

-- Enable the pg_trgm extension so ILIKE '%query%' searches can use GIN indexes.
-- Safe on AWS RDS PostgreSQL; idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for ILIKE name search (first_name, last_name, nickname).
-- These let PostgreSQL use a GIN index scan instead of a sequential scan when
-- the user types a partial name after @.
CREATE INDEX IF NOT EXISTS idx_app_users_first_name_trgm
  ON app_users USING gin (first_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_last_name_trgm
  ON app_users USING gin (last_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_nickname_trgm
  ON app_users USING gin (nickname gin_trgm_ops)
  WHERE deleted_at IS NULL;

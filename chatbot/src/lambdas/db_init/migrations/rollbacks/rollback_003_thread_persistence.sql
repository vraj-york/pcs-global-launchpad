-- Rollback 003: Remove thread persistence tables
-- Run this ONLY to undo migration 003 — it permanently destroys all
-- conversation data. Ensure a backup exists before executing.
--
-- Order: child tables first (FK dependency), then parents.

DROP TABLE IF EXISTS thread_summaries CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

DROP FUNCTION IF EXISTS update_conversations_updated_at() CASCADE;

DELETE FROM schema_migrations WHERE version = '003_thread_persistence.sql';

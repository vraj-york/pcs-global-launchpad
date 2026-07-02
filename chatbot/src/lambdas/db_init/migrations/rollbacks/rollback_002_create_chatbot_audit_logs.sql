-- Rollback for migration 002: Create chatbot_audit_logs
--
-- After running this, also delete the row from schema_migrations:
--   DELETE FROM schema_migrations WHERE version = '002_create_chatbot_audit_logs.sql';

BEGIN;

DROP TABLE IF EXISTS chatbot_audit_logs;
DROP TYPE  IF EXISTS chat_mode;

COMMIT;

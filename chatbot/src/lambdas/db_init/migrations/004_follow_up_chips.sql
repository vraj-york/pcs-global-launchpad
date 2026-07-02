-- Follow-up suggestion chips persisted on assistant rows (rehydrate on GET messages).
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS follow_up_chips JSONB NULL;

COMMENT ON COLUMN messages.follow_up_chips IS
    'Optional [{display, submit}, …] from post-reply suggestion model; updated after stream.';

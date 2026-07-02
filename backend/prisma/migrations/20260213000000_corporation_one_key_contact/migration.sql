-- AlterTable
-- Enforce one key contact per corporation. If duplicate corporation_id rows exist,
-- remove duplicates first (e.g. keep one per corporation) before applying.
ALTER TABLE "corporation_key_contacts" ADD CONSTRAINT "corporation_key_contacts_corporation_id_key" UNIQUE ("corporation_id");

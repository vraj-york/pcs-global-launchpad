-- Email address of the Super Admin who enqueued the job (for completion notification).
ALTER TABLE "app_user_bulk_invite_jobs" ADD COLUMN "requested_by_email" VARCHAR(255);

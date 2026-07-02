-- Async CSV bulk user invite jobs (processed in-app after HTTP 202).
CREATE TABLE "app_user_bulk_invite_jobs" (
    "id" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "csv_body" TEXT NOT NULL,
    "original_file_name" VARCHAR(512),
    "requested_by_cognito_sub" VARCHAR(128) NOT NULL,
    "result_json" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "app_user_bulk_invite_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "app_user_bulk_invite_jobs_requested_by_cognito_sub_created_at_idx" ON "app_user_bulk_invite_jobs"("requested_by_cognito_sub", "created_at");

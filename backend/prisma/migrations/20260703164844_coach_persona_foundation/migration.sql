-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('communication_conflict', 'goal_review', 'one_on_one_coaching', 'leadership_coaching', 'strategic_thinking', 'stress_management', 'communication_skills');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('session_created', 'session_requested', 'session_rescheduled', 'session_cancelled', 'session_completed', 'request_accepted', 'request_declined', 'request_proposed', 'request_reminded', 'request_cancelled', 'notes_added');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'proposed', 'accepted', 'declined', 'cancelled');

-- DropIndex
DROP INDEX "app_users_payment_status_idx";

-- DropIndex
DROP INDEX "app_users_pricing_plan_id_idx";

-- DropIndex
DROP INDEX "app_users_promo_code_id_idx";

-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "professional_title" VARCHAR(255),
ADD COLUMN     "years_of_experience" INTEGER;

-- AlterTable
ALTER TABLE "company_plan_seats" ALTER COLUMN "auto_convert_trial" SET DEFAULT true;

-- CreateTable
CREATE TABLE "coaching_sessions" (
    "id" TEXT NOT NULL,
    "coach_id" VARCHAR(128) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "company_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'scheduled',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER NOT NULL DEFAULT 60,
    "meeting_url" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_notes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "coach_id" VARCHAR(128) NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_client_activities" (
    "id" TEXT NOT NULL,
    "coach_id" VARCHAR(128) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "session_id" TEXT,
    "kind" "ActivityKind" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_client_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_availabilities" (
    "id" TEXT NOT NULL,
    "coach_id" VARCHAR(128) NOT NULL,
    "timezone" VARCHAR(255) NOT NULL,
    "default_session_length_mins" INTEGER NOT NULL DEFAULT 60,
    "buffer_mins" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_availability_windows" (
    "id" TEXT NOT NULL,
    "availability_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_availability_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_requests" (
    "id" TEXT NOT NULL,
    "coach_id" VARCHAR(128) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "preferred_at" TIMESTAMP(3),
    "proposed_slots" JSONB,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "cancel_reason" TEXT,
    "cancelled_by" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_resources" (
    "id" TEXT NOT NULL,
    "lead" VARCHAR(255) NOT NULL,
    "connector" VARCHAR(32) NOT NULL,
    "link_label" VARCHAR(255) NOT NULL,
    "href" VARCHAR(1024) NOT NULL,
    "icon" VARCHAR(64) NOT NULL,
    "accent" VARCHAR(32) NOT NULL,
    "audience" VARCHAR(32) NOT NULL DEFAULT 'COACH',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_updates" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "href" VARCHAR(1024) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'RELEASED',
    "audience" VARCHAR(32) NOT NULL DEFAULT 'COACH',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_features" (
    "id" TEXT NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "audience" VARCHAR(32) NOT NULL DEFAULT 'COACH',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coaching_sessions_coach_id_starts_at_idx" ON "coaching_sessions"("coach_id", "starts_at");

-- CreateIndex
CREATE INDEX "coaching_sessions_client_id_starts_at_idx" ON "coaching_sessions"("client_id", "starts_at");

-- CreateIndex
CREATE INDEX "coaching_sessions_company_id_starts_at_idx" ON "coaching_sessions"("company_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_notes_session_id_key" ON "session_notes"("session_id");

-- CreateIndex
CREATE INDEX "session_notes_coach_id_idx" ON "session_notes"("coach_id");

-- CreateIndex
CREATE INDEX "coach_client_activities_coach_id_created_at_idx" ON "coach_client_activities"("coach_id", "created_at");

-- CreateIndex
CREATE INDEX "coach_client_activities_client_id_created_at_idx" ON "coach_client_activities"("client_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coach_availabilities_coach_id_key" ON "coach_availabilities"("coach_id");

-- CreateIndex
CREATE INDEX "coach_availability_windows_availability_id_day_of_week_idx" ON "coach_availability_windows"("availability_id", "day_of_week");

-- CreateIndex
CREATE INDEX "session_requests_coach_id_status_created_at_idx" ON "session_requests"("coach_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "session_requests_client_id_status_created_at_idx" ON "session_requests"("client_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "coach_resources_audience_is_published_sort_order_idx" ON "coach_resources"("audience", "is_published", "sort_order");

-- CreateIndex
CREATE INDEX "product_updates_audience_status_sort_order_idx" ON "product_updates"("audience", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "beta_features_feature_key_key" ON "beta_features"("feature_key");

-- CreateIndex
CREATE INDEX "beta_features_audience_is_published_sort_order_idx" ON "beta_features"("audience", "is_published", "sort_order");

-- CreateIndex
CREATE INDEX "waitlist_entries_user_id_status_idx" ON "waitlist_entries"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_feature_id_user_id_key" ON "waitlist_entries"("feature_id", "user_id");

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "coaching_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_client_activities" ADD CONSTRAINT "coach_client_activities_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_client_activities" ADD CONSTRAINT "coach_client_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_client_activities" ADD CONSTRAINT "coach_client_activities_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "coaching_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_availabilities" ADD CONSTRAINT "coach_availabilities_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_availability_windows" ADD CONSTRAINT "coach_availability_windows_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "coach_availabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "beta_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "app_user_bulk_invite_jobs_requested_by_cognito_sub_created_at_i" RENAME TO "app_user_bulk_invite_jobs_requested_by_cognito_sub_created__idx";

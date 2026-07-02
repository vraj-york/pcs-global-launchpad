-- Assessment module: new enums and tables, options.option_key, bsp_styles text[] columns (BSP row data dropped).

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('in_progress', 'completed', 'scored', 'report_generated');

-- CreateEnum
CREATE TYPE "AssessmentScoreStyleContext" AS ENUM (
  'professional_typical',
  'professional_stressful',
  'personal_typical',
  'personal_stressful',
  'overall'
);

-- CreateEnum
CREATE TYPE "AssessmentScoreStyleType" AS ENUM ('basic', 'plural', 'split');

-- DropTable (recreate below): lose existing BSP style rows as agreed
DROP TABLE IF EXISTS "bsp_styles" CASCADE;

-- AlterTable options: question_name -> option_key
DROP INDEX IF EXISTS "options_question_name_key";
DROP INDEX IF EXISTS "options_question_name_idx";
ALTER TABLE "options" RENAME COLUMN "question_name" TO "option_key";
CREATE UNIQUE INDEX "options_option_key_key" ON "options"("option_key");
CREATE INDEX "options_option_key_idx" ON "options"("option_key");

-- CreateTable bsp_styles (text[] profile fields)
CREATE TABLE "bsp_styles" (
    "id" TEXT NOT NULL,
    "style_number" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "has_video" BOOLEAN NOT NULL DEFAULT false,
    "youtube_video_id" VARCHAR(20),
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "environmental_preferences" TEXT[] NOT NULL,
    "interaction_preferences" TEXT[] NOT NULL,
    "character_strengths" TEXT[] NOT NULL,
    "psychological_needs" TEXT[] NOT NULL,
    "likes" TEXT[] NOT NULL,
    "dislikes" TEXT[] NOT NULL,
    "work_preferences" TEXT[] NOT NULL,
    "warning_signs" TEXT[] NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bsp_styles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bsp_styles_style_number_key" ON "bsp_styles"("style_number");
CREATE UNIQUE INDEX "bsp_styles_title_key" ON "bsp_styles"("title");
CREATE UNIQUE INDEX "bsp_styles_display_order_key" ON "bsp_styles"("display_order");

-- CreateTable assessments
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(128) NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessments_user_id_idx" ON "assessments"("user_id");
CREATE INDEX "assessments_user_id_status_idx" ON "assessments"("user_id", "status");

ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_users"("cognito_sub") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable question_responses
CREATE TABLE "question_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "value" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_responses_assessment_id_option_id_key" ON "question_responses"("assessment_id", "option_id");
CREATE INDEX "question_responses_assessment_id_idx" ON "question_responses"("assessment_id");
CREATE INDEX "question_responses_option_id_idx" ON "question_responses"("option_id");

ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_option_id_fkey"
  FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable assessment_scores
CREATE TABLE "assessment_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_scores_assessment_id_key" ON "assessment_scores"("assessment_id");

ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable assessment_score_styles
CREATE TABLE "assessment_score_styles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_score_id" UUID NOT NULL,
    "bsp_style_id" TEXT NOT NULL,
    "context" "AssessmentScoreStyleContext" NOT NULL,
    "type" "AssessmentScoreStyleType" NOT NULL,

    CONSTRAINT "assessment_score_styles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_score_styles_assessment_score_id_context_key"
  ON "assessment_score_styles"("assessment_score_id", "context");
CREATE INDEX "assessment_score_styles_assessment_score_id_idx" ON "assessment_score_styles"("assessment_score_id");
CREATE INDEX "assessment_score_styles_bsp_style_id_idx" ON "assessment_score_styles"("bsp_style_id");

ALTER TABLE "assessment_score_styles" ADD CONSTRAINT "assessment_score_styles_assessment_score_id_fkey"
  FOREIGN KEY ("assessment_score_id") REFERENCES "assessment_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_score_styles" ADD CONSTRAINT "assessment_score_styles_bsp_style_id_fkey"
  FOREIGN KEY ("bsp_style_id") REFERENCES "bsp_styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable assessment_reports
CREATE TABLE "assessment_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "assessment_score_id" UUID NOT NULL,
    "report" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_reports_assessment_id_key" ON "assessment_reports"("assessment_id");
CREATE UNIQUE INDEX "assessment_reports_assessment_score_id_key" ON "assessment_reports"("assessment_score_id");

ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_assessment_score_id_fkey"
  FOREIGN KEY ("assessment_score_id") REFERENCES "assessment_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable report_content
CREATE TABLE "report_content" (
    "id" TEXT NOT NULL,
    "section_key" VARCHAR(255) NOT NULL,
    "content" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_content_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_content_section_key_key" ON "report_content"("section_key");

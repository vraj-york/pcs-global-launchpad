-- Growth Spark: day-one templates per BSP style + intro-shown metadata per assessment cycle.

CREATE TABLE "growth_spark_templates" (
    "id" TEXT NOT NULL,
    "style_number" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL DEFAULT 'Daily Growth Spark',
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_spark_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "growth_spark_templates_style_number_key" ON "growth_spark_templates"("style_number");

ALTER TABLE "growth_spark_templates"
  ADD CONSTRAINT "growth_spark_templates_style_number_fkey"
  FOREIGN KEY ("style_number") REFERENCES "bsp_styles"("style_number")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "user_growth_spark_intro" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "assessment_id" UUID NOT NULL,
    "shown_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_growth_spark_intro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_growth_spark_intro_user_id_assessment_id_key"
  ON "user_growth_spark_intro"("user_id", "assessment_id");

CREATE INDEX "user_growth_spark_intro_user_id_idx" ON "user_growth_spark_intro"("user_id");

ALTER TABLE "user_growth_spark_intro"
  ADD CONSTRAINT "user_growth_spark_intro_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_users"("cognito_sub")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_growth_spark_intro"
  ADD CONSTRAINT "user_growth_spark_intro_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

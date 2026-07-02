-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('environmental_preferences', 'interaction_preferences', 'character_strengths_distressors');

-- CreateEnum
CREATE TYPE "SituationType" AS ENUM ('typical', 'stressful');

-- CreateEnum
CREATE TYPE "LifeContextType" AS ENUM ('professional', 'personal');

-- CreateEnum
CREATE TYPE "OptionColor" AS ENUM ('red', 'green', 'blue', 'grey');

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_order" SMALLINT NOT NULL,
    "question_text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "situation" "SituationType" NOT NULL,
    "life_context" "LifeContextType" NOT NULL,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "question_name" TEXT NOT NULL,
    "color" "OptionColor" NOT NULL,
    "option_text" TEXT NOT NULL,
    "display_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsp_styles" (
    "id" TEXT NOT NULL,
    "style_number" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "has_video" BOOLEAN NOT NULL DEFAULT false,
    "youtube_video_id" VARCHAR(20),
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "environmental_preference" TEXT NOT NULL,
    "interaction_preference" TEXT NOT NULL,
    "character_strengths" TEXT NOT NULL,
    "psychological_needs" TEXT NOT NULL,
    "likes" TEXT NOT NULL,
    "dislikes" TEXT NOT NULL,
    "work_preferences" TEXT NOT NULL,
    "warning_signs_when_feeling_stressed" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bsp_styles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_question_order_key" ON "questions"("question_order");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE INDEX "questions_situation_idx" ON "questions"("situation");

-- CreateIndex
CREATE INDEX "questions_life_context_idx" ON "questions"("life_context");

-- CreateIndex
CREATE INDEX "questions_version_idx" ON "questions"("version");

-- CreateIndex
CREATE INDEX "questions_is_active_idx" ON "questions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "options_question_name_key" ON "options"("question_name");

-- CreateIndex
CREATE INDEX "options_question_id_idx" ON "options"("question_id");

-- CreateIndex
CREATE INDEX "options_question_name_idx" ON "options"("question_name");

-- CreateIndex
CREATE INDEX "options_color_idx" ON "options"("color");

-- CreateIndex
CREATE UNIQUE INDEX "options_question_id_color_key" ON "options"("question_id", "color");

-- CreateIndex
CREATE UNIQUE INDEX "options_question_id_display_order_key" ON "options"("question_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "bsp_styles_style_number_key" ON "bsp_styles"("style_number");

-- CreateIndex
CREATE INDEX "bsp_styles_style_number_idx" ON "bsp_styles"("style_number");

-- CreateIndex
CREATE INDEX "bsp_styles_display_order_idx" ON "bsp_styles"("display_order");

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

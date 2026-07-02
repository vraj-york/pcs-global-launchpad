-- Required text: when feeling stressed (backfill existing rows, then drop default to match Prisma)
ALTER TABLE "bsp_styles" ADD COLUMN "when_feeling_stressed" TEXT NOT NULL DEFAULT '';
ALTER TABLE "bsp_styles" ALTER COLUMN "when_feeling_stressed" DROP DEFAULT;

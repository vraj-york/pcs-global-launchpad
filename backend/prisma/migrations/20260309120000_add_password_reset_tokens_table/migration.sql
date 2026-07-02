-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "token" VARCHAR(10) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "expires_at" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

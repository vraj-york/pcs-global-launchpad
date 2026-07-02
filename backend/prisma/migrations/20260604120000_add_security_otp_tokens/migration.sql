-- CreateTable
CREATE TABLE "security_otp_tokens" (
    "token" VARCHAR(10) NOT NULL,
    "cognito_sub" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "expires_at" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_otp_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "security_otp_tokens_cognito_sub_purpose_idx" ON "security_otp_tokens"("cognito_sub", "purpose");

-- CreateIndex
CREATE INDEX "security_otp_tokens_email_idx" ON "security_otp_tokens"("email");

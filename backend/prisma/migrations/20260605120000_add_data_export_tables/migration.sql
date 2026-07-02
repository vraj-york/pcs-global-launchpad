-- CreateTable
CREATE TABLE "data_export_requests" (
    "id" TEXT NOT NULL,
    "cognito_sub" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "s3_key" VARCHAR(512),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_download_tokens" (
    "token" VARCHAR(64) NOT NULL,
    "request_id" TEXT NOT NULL,
    "expires_at" INTEGER NOT NULL,
    "downloaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_download_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "data_export_requests_cognito_sub_created_at_idx" ON "data_export_requests"("cognito_sub", "created_at");

-- CreateIndex
CREATE INDEX "data_export_requests_status_idx" ON "data_export_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "data_export_download_tokens_request_id_key" ON "data_export_download_tokens"("request_id");

-- CreateIndex
CREATE INDEX "data_export_download_tokens_expires_at_idx" ON "data_export_download_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "data_export_download_tokens" ADD CONSTRAINT "data_export_download_tokens_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "data_export_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

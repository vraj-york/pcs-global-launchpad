-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_request_attachments" (
    "id" TEXT NOT NULL,
    "support_request_id" TEXT NOT NULL,
    "file_name" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_requests_email_idx" ON "support_requests"("email");

-- CreateIndex
CREATE INDEX "support_requests_created_at_idx" ON "support_requests"("created_at");

-- CreateIndex
CREATE INDEX "support_request_attachments_support_request_id_idx" ON "support_request_attachments"("support_request_id");


-- AddForeignKey
ALTER TABLE "support_request_attachments" ADD CONSTRAINT "support_request_attachments_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "billing_subscription_actions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(255),
    "additional_notes" VARCHAR(1000),
    "actor_kind" VARCHAR(30) NOT NULL,
    "actor_cognito_sub" VARCHAR(255) NOT NULL,
    "actor_name" VARCHAR(255) NOT NULL,
    "actor_role" VARCHAR(255) NOT NULL,
    "plan_label" VARCHAR(255),
    "plan_type_id" VARCHAR(30),
    "amount_cents" INTEGER,
    "currency" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_subscription_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_subscription_actions_company_id_created_at_idx" ON "billing_subscription_actions"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "billing_subscription_actions" ADD CONSTRAINT "billing_subscription_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

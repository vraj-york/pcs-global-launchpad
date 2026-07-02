-- Submodule-based RBAC: replace PermissionAction / permissions / role_permissions

DROP TABLE IF EXISTS "role_permissions";
DROP TABLE IF EXISTS "permissions";
DROP TYPE IF EXISTS "PermissionAction";

ALTER TABLE "cognito_user_groups" ADD COLUMN "role_category_id" TEXT;

CREATE TABLE "submodules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "module_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submodules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_category_submodules" (
    "id" TEXT NOT NULL,
    "role_category_id" TEXT NOT NULL,
    "submodule_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_category_submodules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cognito_user_groups_role_category_id_idx" ON "cognito_user_groups"("role_category_id");

CREATE UNIQUE INDEX "submodules_code_key" ON "submodules"("code");
CREATE UNIQUE INDEX "submodules_key_key" ON "submodules"("key");
CREATE UNIQUE INDEX "submodules_module_id_key_key" ON "submodules"("module_id", "key");
CREATE INDEX "submodules_module_id_idx" ON "submodules"("module_id");

CREATE UNIQUE INDEX "role_category_submodules_role_category_id_submodule_id_key" ON "role_category_submodules"("role_category_id", "submodule_id");
CREATE INDEX "role_category_submodules_role_category_id_idx" ON "role_category_submodules"("role_category_id");
CREATE INDEX "role_category_submodules_submodule_id_idx" ON "role_category_submodules"("submodule_id");

ALTER TABLE "cognito_user_groups" ADD CONSTRAINT "cognito_user_groups_role_category_id_fkey" FOREIGN KEY ("role_category_id") REFERENCES "role_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submodules" ADD CONSTRAINT "submodules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_category_submodules" ADD CONSTRAINT "role_category_submodules_role_category_id_fkey" FOREIGN KEY ("role_category_id") REFERENCES "role_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_category_submodules" ADD CONSTRAINT "role_category_submodules_submodule_id_fkey" FOREIGN KEY ("submodule_id") REFERENCES "submodules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

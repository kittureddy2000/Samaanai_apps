-- DropIndex
DROP INDEX "public"."todo_task_google_task_id_key";

-- DropIndex
DROP INDEX "public"."todo_task_microsoft_todo_id_key";

-- AlterTable
ALTER TABLE "todo_task" ADD COLUMN     "category_id" TEXT;

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_user_id_idx" ON "category"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_user_id_name_key" ON "category"("user_id", "name");

-- CreateIndex
CREATE INDEX "todo_task_user_id_category_id_idx" ON "todo_task"("user_id", "category_id");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Task_userId_googleTaskId_key" RENAME TO "todo_task_user_id_google_task_id_key";

-- RenameIndex
ALTER INDEX "Task_userId_microsoftTodoId_key" RENAME TO "todo_task_user_id_microsoft_todo_id_key";

-- Data Migration: Create default "Tasks" category for all existing users
INSERT INTO "category" ("id", "user_id", "name", "color", "icon", "is_default", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  "id" as "user_id",
  'Tasks',
  '#2196f3',
  'format-list-checks',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "auth_user"
ON CONFLICT DO NOTHING;

-- Assign all existing tasks to the default "Tasks" category
UPDATE "todo_task" t
SET "category_id" = c."id"
FROM "category" c
WHERE t."user_id" = c."user_id"
  AND c."is_default" = true
  AND t."category_id" IS NULL;

-- DropIndex: Remove global unique constraints on microsoftTodoId and googleTaskId
-- These should be unique per user, not globally unique
DROP INDEX IF EXISTS "Task_microsoft_todo_id_key";
DROP INDEX IF EXISTS "Task_google_task_id_key";

-- CreateIndex: Add compound unique constraints per user
-- This ensures each user can have unique Microsoft/Google task IDs
-- but different users can sync the same external task IDs
CREATE UNIQUE INDEX "Task_userId_microsoftTodoId_key" ON "todo_task"("user_id", "microsoft_todo_id");
CREATE UNIQUE INDEX "Task_userId_googleTaskId_key" ON "todo_task"("user_id", "google_task_id");

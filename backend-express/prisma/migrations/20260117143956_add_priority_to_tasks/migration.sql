-- AlterTable
ALTER TABLE "todo_task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "todo_task_user_id_priority_idx" ON "todo_task"("user_id", "priority");

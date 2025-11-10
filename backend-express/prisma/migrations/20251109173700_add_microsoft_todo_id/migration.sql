-- AlterTable
ALTER TABLE "todo_task" ADD COLUMN "microsoft_todo_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "todo_task_microsoft_todo_id_key" ON "todo_task"("microsoft_todo_id");

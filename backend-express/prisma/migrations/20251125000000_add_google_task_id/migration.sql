-- AlterTable
ALTER TABLE "todo_task" ADD COLUMN     "google_task_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "todo_task_google_task_id_key" ON "todo_task"("google_task_id");

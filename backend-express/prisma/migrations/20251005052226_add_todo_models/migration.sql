-- CreateTable
CREATE TABLE "todo_task" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "reminder_type" TEXT,
    "image_url" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todo_task_user_id_due_date_idx" ON "todo_task"("user_id", "due_date" ASC);

-- CreateIndex
CREATE INDEX "todo_task_user_id_completed_idx" ON "todo_task"("user_id", "completed");

-- AddForeignKey
ALTER TABLE "todo_task" ADD CONSTRAINT "todo_task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

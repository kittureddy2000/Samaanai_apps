-- AlterTable
ALTER TABLE "auth_user" ADD COLUMN "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_google_id_key" ON "auth_user"("google_id");

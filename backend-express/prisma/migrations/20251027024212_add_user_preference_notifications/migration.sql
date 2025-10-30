-- AlterTable
ALTER TABLE "users_userprofile" ADD COLUMN     "dark_mode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weekly_reports" BOOLEAN NOT NULL DEFAULT true;

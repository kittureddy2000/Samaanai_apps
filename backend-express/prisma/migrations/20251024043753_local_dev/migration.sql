/*
  Warnings:

  - You are about to drop the `finance_account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_holding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_institution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_investmenttransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_monthlyspending` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_networthsnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_plaidwebhook` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_security` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_spendingcategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."finance_account" DROP CONSTRAINT "finance_account_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_holding" DROP CONSTRAINT "finance_holding_account_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_holding" DROP CONSTRAINT "finance_holding_security_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_institution" DROP CONSTRAINT "finance_institution_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_investmenttransaction" DROP CONSTRAINT "finance_investmenttransaction_account_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_investmenttransaction" DROP CONSTRAINT "finance_investmenttransaction_security_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_monthlyspending" DROP CONSTRAINT "finance_monthlyspending_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_monthlyspending" DROP CONSTRAINT "finance_monthlyspending_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_networthsnapshot" DROP CONSTRAINT "finance_networthsnapshot_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_spendingcategory" DROP CONSTRAINT "finance_spendingcategory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."finance_transaction" DROP CONSTRAINT "finance_transaction_account_id_fkey";

-- DropTable
DROP TABLE "public"."finance_account";

-- DropTable
DROP TABLE "public"."finance_holding";

-- DropTable
DROP TABLE "public"."finance_institution";

-- DropTable
DROP TABLE "public"."finance_investmenttransaction";

-- DropTable
DROP TABLE "public"."finance_monthlyspending";

-- DropTable
DROP TABLE "public"."finance_networthsnapshot";

-- DropTable
DROP TABLE "public"."finance_plaidwebhook";

-- DropTable
DROP TABLE "public"."finance_security";

-- DropTable
DROP TABLE "public"."finance_spendingcategory";

-- DropTable
DROP TABLE "public"."finance_transaction";

-- CreateTable
CREATE TABLE "auth_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "date_joined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_userprofile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "date_of_birth" DATE,
    "timezone" TEXT NOT NULL DEFAULT 'US/Pacific',
    "start_of_week" INTEGER NOT NULL DEFAULT 2,
    "metabolic_rate" INTEGER,
    "weight_loss_goal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_userprofile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_webauthncredential" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "sign_count" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" TIMESTAMP(3),

    CONSTRAINT "users_webauthncredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_institution" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plaid_institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "url" TEXT,
    "access_token" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "sync_cursor" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "needs_update" BOOLEAN NOT NULL DEFAULT false,
    "last_successful_update" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_account" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "plaid_account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "official_name" TEXT,
    "mask" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL,
    "current_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(12,2),
    "limit" DECIMAL(12,2),
    "iso_currency_code" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transaction" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "plaid_transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "iso_currency_code" TEXT NOT NULL DEFAULT 'USD',
    "name" TEXT NOT NULL,
    "merchant_name" TEXT,
    "category" JSONB,
    "primary_category" TEXT,
    "detailed_category" TEXT,
    "date" DATE NOT NULL,
    "authorized_date" DATE,
    "datetime" TIMESTAMP(3),
    "payment_channel" TEXT NOT NULL,
    "transaction_type" TEXT,
    "location" JSONB,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "pending_transaction_id" TEXT,
    "account_owner" TEXT,
    "user_category" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_spendingcategory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "monthly_budget" DECIMAL(10,2),
    "plaid_categories" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_spendingcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_monthlyspending" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount_spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_monthlyspending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_networthsnapshot" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_assets" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_liabilities" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_worth" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cash_and_investments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit_cards" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loans" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_networthsnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_plaidwebhook" (
    "id" TEXT NOT NULL,
    "webhook_type" TEXT NOT NULL,
    "webhook_code" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_plaidwebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_security" (
    "id" TEXT NOT NULL,
    "plaid_security_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker_symbol" TEXT,
    "cusip" TEXT,
    "isin" TEXT,
    "sedol" TEXT,
    "type" TEXT,
    "close_price" DECIMAL(12,4),
    "close_price_as_of" DATE,
    "institution_id" TEXT,
    "institution_security_id" TEXT,
    "is_cash_equivalent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_security_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_holding" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "security_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "institution_price" DECIMAL(12,4) NOT NULL,
    "institution_price_as_of" DATE,
    "institution_value" DECIMAL(12,2) NOT NULL,
    "cost_basis" DECIMAL(12,2),
    "iso_currency_code" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_investmenttransaction" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "plaid_investment_transaction_id" TEXT NOT NULL,
    "security_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(18,8),
    "price" DECIMAL(12,4),
    "fees" DECIMAL(12,2),
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "iso_currency_code" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_investmenttransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_mealentry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_mealentry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_exerciseentry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "calories_burned" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_exerciseentry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_weightentry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "nutrition_weightentry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_username_key" ON "auth_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_userprofile_user_id_key" ON "users_userprofile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_webauthncredential_user_id_credential_id_key" ON "users_webauthncredential"("user_id", "credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_institution_item_id_key" ON "finance_institution"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_institution_user_id_plaid_institution_id_key" ON "finance_institution"("user_id", "plaid_institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_account_plaid_account_id_key" ON "finance_account"("plaid_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transaction_plaid_transaction_id_key" ON "finance_transaction"("plaid_transaction_id");

-- CreateIndex
CREATE INDEX "finance_transaction_date_idx" ON "finance_transaction"("date" DESC);

-- CreateIndex
CREATE INDEX "finance_transaction_primary_category_idx" ON "finance_transaction"("primary_category");

-- CreateIndex
CREATE INDEX "finance_transaction_account_id_date_idx" ON "finance_transaction"("account_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "finance_spendingcategory_user_id_name_key" ON "finance_spendingcategory"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_monthlyspending_user_id_category_id_year_month_key" ON "finance_monthlyspending"("user_id", "category_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "finance_networthsnapshot_user_id_date_key" ON "finance_networthsnapshot"("user_id", "date");

-- CreateIndex
CREATE INDEX "finance_plaidwebhook_item_id_idx" ON "finance_plaidwebhook"("item_id");

-- CreateIndex
CREATE INDEX "finance_plaidwebhook_webhook_type_idx" ON "finance_plaidwebhook"("webhook_type");

-- CreateIndex
CREATE INDEX "finance_plaidwebhook_processed_idx" ON "finance_plaidwebhook"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "finance_security_plaid_security_id_key" ON "finance_security"("plaid_security_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_holding_account_id_security_id_key" ON "finance_holding"("account_id", "security_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_investmenttransaction_plaid_investment_transaction__key" ON "finance_investmenttransaction"("plaid_investment_transaction_id");

-- CreateIndex
CREATE INDEX "finance_investmenttransaction_date_idx" ON "finance_investmenttransaction"("date" DESC);

-- CreateIndex
CREATE INDEX "finance_investmenttransaction_account_id_idx" ON "finance_investmenttransaction"("account_id");

-- CreateIndex
CREATE INDEX "finance_investmenttransaction_type_idx" ON "finance_investmenttransaction"("type");

-- CreateIndex
CREATE INDEX "nutrition_mealentry_user_id_date_idx" ON "nutrition_mealentry"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_mealentry_user_id_date_meal_type_key" ON "nutrition_mealentry"("user_id", "date", "meal_type");

-- CreateIndex
CREATE INDEX "nutrition_exerciseentry_user_id_date_idx" ON "nutrition_exerciseentry"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_exerciseentry_user_id_date_key" ON "nutrition_exerciseentry"("user_id", "date");

-- CreateIndex
CREATE INDEX "nutrition_weightentry_user_id_date_idx" ON "nutrition_weightentry"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_weightentry_user_id_date_key" ON "nutrition_weightentry"("user_id", "date");

-- AddForeignKey
ALTER TABLE "users_userprofile" ADD CONSTRAINT "users_userprofile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_webauthncredential" ADD CONSTRAINT "users_webauthncredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_institution" ADD CONSTRAINT "finance_institution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_account" ADD CONSTRAINT "finance_account_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "finance_institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transaction" ADD CONSTRAINT "finance_transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_spendingcategory" ADD CONSTRAINT "finance_spendingcategory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_monthlyspending" ADD CONSTRAINT "finance_monthlyspending_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_monthlyspending" ADD CONSTRAINT "finance_monthlyspending_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_spendingcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_networthsnapshot" ADD CONSTRAINT "finance_networthsnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_holding" ADD CONSTRAINT "finance_holding_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_holding" ADD CONSTRAINT "finance_holding_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "finance_security"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_investmenttransaction" ADD CONSTRAINT "finance_investmenttransaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_investmenttransaction" ADD CONSTRAINT "finance_investmenttransaction_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "finance_security"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_mealentry" ADD CONSTRAINT "nutrition_mealentry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_exerciseentry" ADD CONSTRAINT "nutrition_exerciseentry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_weightentry" ADD CONSTRAINT "nutrition_weightentry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

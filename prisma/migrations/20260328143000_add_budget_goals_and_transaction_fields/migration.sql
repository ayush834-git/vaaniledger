-- Bring the database in line with the current goals and recurring transaction features.

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "recurrence" TEXT;

UPDATE "Transaction"
SET "recurrence" = 'NONE'
WHERE "recurrence" IS NULL;

ALTER TABLE "Transaction"
ALTER COLUMN "recurrence" SET DEFAULT 'NONE';

ALTER TABLE "Transaction"
ALTER COLUMN "recurrence" SET NOT NULL;

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "nextDueAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BudgetGoal" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',

    CONSTRAINT "BudgetGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BudgetGoal_userId_category_period_key"
ON "BudgetGoal"("userId", "category", "period");

CREATE INDEX IF NOT EXISTS "BudgetGoal_userId_idx"
ON "BudgetGoal"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BudgetGoal_userId_fkey'
  ) THEN
    ALTER TABLE "BudgetGoal"
    ADD CONSTRAINT "BudgetGoal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

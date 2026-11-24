/*
  Warnings:

  - Changed the type of `category` on the `Budget` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FOOD', 'TRANSPORT', 'HOUSING', 'UTILITIES', 'HEALTH', 'EDUCATION', 'ENTERTAINMENT', 'SHOPPING', 'OTHER');

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "category",
ADD COLUMN     "category" "Category" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_category_month_year_key" ON "Budget"("userId", "category", "month", "year");

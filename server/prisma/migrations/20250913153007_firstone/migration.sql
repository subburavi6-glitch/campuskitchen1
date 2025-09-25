/*
  Warnings:

  - You are about to drop the column `preferred_vendor_id` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `storage_type` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `dish_id` on the `meal_plans` table. All the data in the column will be lost.
  - You are about to drop the column `qty_per_student` on the `recipes` table. All the data in the column will be lost.
  - Added the required column `unit_id` to the `items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty_per_5_students` to the `recipes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `vendors` table without a default value. This is not possible if the table is not empty.
  - Made the column `gst_no` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `vendors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "IndentStatus" ADD VALUE 'SENT';

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_preferred_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_dish_id_fkey";

-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "cost_per_5_students" TEXT NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "indent_items" ADD COLUMN     "estimated_cost" TEXT NOT NULL DEFAULT '0',
ALTER COLUMN "requested_qty" SET DATA TYPE TEXT,
ALTER COLUMN "approved_qty" SET DEFAULT '0',
ALTER COLUMN "approved_qty" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "indents" ADD COLUMN     "auto_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "total_cost" TEXT NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "comments" TEXT;

-- AlterTable
ALTER TABLE "items" DROP COLUMN "preferred_vendor_id",
DROP COLUMN "storage_type",
DROP COLUMN "unit",
ADD COLUMN     "cost_per_unit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "points_value" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storage_type_id" TEXT,
ADD COLUMN     "unit_id" TEXT NOT NULL,
ADD COLUMN     "vendor_id" TEXT;

-- AlterTable
ALTER TABLE "meal_plans" DROP COLUMN "dish_id";

-- AlterTable
ALTER TABLE "po_items" ADD COLUMN     "points_used" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "ordered_qty" SET DATA TYPE TEXT,
ALTER COLUMN "unit_cost" SET DATA TYPE TEXT,
ALTER COLUMN "tax_rate" SET DEFAULT '18',
ALTER COLUMN "tax_rate" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "subtotal" SET DEFAULT '0',
ALTER COLUMN "subtotal" SET DATA TYPE TEXT,
ALTER COLUMN "tax" SET DEFAULT '0',
ALTER COLUMN "tax" SET DATA TYPE TEXT,
ALTER COLUMN "total" SET DEFAULT '0',
ALTER COLUMN "total" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "qty_per_student",
ADD COLUMN     "qty_per_5_students" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "category_id" TEXT NOT NULL,
ALTER COLUMN "gst_no" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- CreateTable
CREATE TABLE "meal_plan_dishes" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL DEFAULT 1,
    "is_main_dish" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_plan_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_dishes_meal_plan_id_dish_id_key" ON "meal_plan_dishes"("meal_plan_id", "dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "storage_types_name_key" ON "storage_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_categories_name_key" ON "vendor_categories"("name");

-- AddForeignKey
ALTER TABLE "meal_plan_dishes" ADD CONSTRAINT "meal_plan_dishes_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_dishes" ADD CONSTRAINT "meal_plan_dishes_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_storage_type_id_fkey" FOREIGN KEY ("storage_type_id") REFERENCES "storage_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vendor_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

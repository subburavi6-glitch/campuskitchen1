/*
  Warnings:

  - The `tax_rate` column on the `po_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `subtotal` column on the `purchase_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tax` column on the `purchase_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `total` column on the `purchase_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `ordered_qty` on the `po_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unit_cost` on the `po_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "po_items" DROP COLUMN "ordered_qty",
ADD COLUMN     "ordered_qty" DECIMAL(10,3) NOT NULL,
DROP COLUMN "unit_cost",
ADD COLUMN     "unit_cost" DECIMAL(10,2) NOT NULL,
DROP COLUMN "tax_rate",
ADD COLUMN     "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "subtotal",
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
DROP COLUMN "tax",
ADD COLUMN     "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
DROP COLUMN "total",
ADD COLUMN     "total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterEnum
ALTER TYPE "IndentStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "meal_plan_id" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

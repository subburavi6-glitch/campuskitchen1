-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SCANNER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mess_facility_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mess_facility_id_fkey" FOREIGN KEY ("mess_facility_id") REFERENCES "mess_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

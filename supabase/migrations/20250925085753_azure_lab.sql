/*
  # Meal Attendance and Hostel Management System

  1. New Tables
    - `hostels` - Hostel information
    - `meal_attendance_settings` - System settings for meal attendance
    - `payment_gateways` - Dynamic payment gateway configuration
    - `meal_attendance_reminders` - Track reminder notifications

  2. Schema Updates
    - Add hostel-related fields to students table
    - Add hostel support to packages table
    - Add superadmin role
    - Add meal attendance mandatory settings

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each table
*/

-- CreateEnum for hostel types
CREATE TYPE "HostelType" AS ENUM ('BOYS', 'GIRLS', 'MIXED');

-- CreateEnum for payment gateway types
CREATE TYPE "PaymentGatewayType" AS ENUM ('RAZORPAY', 'PAYU', 'STRIPE', 'PHONEPE');

-- CreateEnum for payment environment
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');

-- Add SUPERADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- Create hostels table
CREATE TABLE IF NOT EXISTS "hostels" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "HostelType" NOT NULL,
  "location" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 0,
  "warden_name" TEXT,
  "warden_phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- Create meal attendance settings table
CREATE TABLE IF NOT EXISTS "meal_attendance_settings" (
  "id" TEXT NOT NULL,
  "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
  "reminder_start_time" TEXT NOT NULL DEFAULT '15:00',
  "reminder_end_time" TEXT NOT NULL DEFAULT '22:00',
  "cutoff_time" TEXT NOT NULL DEFAULT '23:00',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meal_attendance_settings_pkey" PRIMARY KEY ("id")
);

-- Create payment gateways table
CREATE TABLE IF NOT EXISTS "payment_gateways" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PaymentGatewayType" NOT NULL,
  "environment" "PaymentEnvironment" NOT NULL,
  "key_id" TEXT NOT NULL,
  "key_secret" TEXT NOT NULL,
  "webhook_secret" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- Create meal attendance reminders table
CREATE TABLE IF NOT EXISTS "meal_attendance_reminders" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "reminder_date" DATE NOT NULL,
  "reminder_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "meals_pending" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "completed" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "meal_attendance_reminders_pkey" PRIMARY KEY ("id")
);

-- Create package hostels junction table
CREATE TABLE IF NOT EXISTS "package_hostels" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "hostel_id" TEXT NOT NULL,

  CONSTRAINT "package_hostels_pkey" PRIMARY KEY ("id")
);

-- Add hostel-related columns to students table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_hosteler') THEN
    ALTER TABLE "students" ADD COLUMN "is_hosteler" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'hostel_id') THEN
    ALTER TABLE "students" ADD COLUMN "hostel_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'mess_name') THEN
    ALTER TABLE "students" ADD COLUMN "mess_name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'mobile_login_enabled') THEN
    ALTER TABLE "students" ADD COLUMN "mobile_login_enabled" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add meal attendance tracking columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_attendances' AND column_name = 'marked_at') THEN
    ALTER TABLE "meal_attendances" ADD COLUMN "marked_at" TIMESTAMP(3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_attendances' AND column_name = 'is_mandatory_marked') THEN
    ALTER TABLE "meal_attendances" ADD COLUMN "is_mandatory_marked" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "hostels_name_key" ON "hostels"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "package_hostels_package_id_hostel_id_key" ON "package_hostels"("package_id", "hostel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "meal_attendance_reminders_student_id_reminder_date_key" ON "meal_attendance_reminders"("student_id", "reminder_date");

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_hostel_id_fkey') THEN
    ALTER TABLE "students" ADD CONSTRAINT "students_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'package_hostels_package_id_fkey') THEN
    ALTER TABLE "package_hostels" ADD CONSTRAINT "package_hostels_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'package_hostels_hostel_id_fkey') THEN
    ALTER TABLE "package_hostels" ADD CONSTRAINT "package_hostels_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meal_attendance_reminders_student_id_fkey') THEN
    ALTER TABLE "meal_attendance_reminders" ADD CONSTRAINT "meal_attendance_reminders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE "hostels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_attendance_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_gateways" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_attendance_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "package_hostels" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON "hostels" FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "meal_attendance_settings" FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "payment_gateways" FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "meal_attendance_reminders" FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON "package_hostels" FOR ALL TO authenticated USING (true);

-- Insert default meal attendance settings
INSERT INTO "meal_attendance_settings" ("id", "is_mandatory", "reminder_start_time", "reminder_end_time", "cutoff_time")
VALUES ('default-settings', false, '15:00', '22:00', '23:00')
ON CONFLICT ("id") DO NOTHING;

-- Insert sample hostels
INSERT INTO "hostels" ("id", "name", "type", "location", "capacity", "warden_name", "active")
VALUES 
  ('hostel-001', 'Girls Hostel - Nursing', 'GIRLS', 'Campus North Block', 200, 'Mrs. Priya Sharma', true),
  ('hostel-002', 'Boys Hostel - Nursing', 'BOYS', 'Campus South Block', 150, 'Mr. Rajesh Kumar', true),
  ('hostel-003', 'Gowthami Hostel', 'GIRLS', 'Campus East Block', 180, 'Mrs. Lakshmi Devi', true)
ON CONFLICT ("id") DO NOTHING;

-- Insert default payment gateway (Razorpay test)
INSERT INTO "payment_gateways" ("id", "name", "type", "environment", "key_id", "key_secret", "webhook_secret", "active")
VALUES ('razorpay-test', 'Razorpay Test', 'RAZORPAY', 'TEST', 'rzp_test_key', 'test_secret', 'test_webhook_secret', true)
ON CONFLICT ("id") DO NOTHING;
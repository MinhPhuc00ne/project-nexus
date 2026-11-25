-- AlterTable
ALTER TABLE "staff_invitations"
ADD COLUMN "assigned_email" VARCHAR(255),
ADD COLUMN "otp" VARCHAR(10);

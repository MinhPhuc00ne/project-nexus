-- AlterTable
ALTER TABLE "users" ADD COLUMN "personal_email" VARCHAR(255),
ADD COLUMN "platform_email" VARCHAR(255);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "personal_email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(50),
    "department" VARCHAR(100),
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_platform_email_key" ON "users"("platform_email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_key" ON "staff_invitations"("token");

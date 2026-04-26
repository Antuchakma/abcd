-- CreateEnum
CREATE TYPE "DoctorSignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DoctorSignupRequest" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "status" "DoctorSignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorSignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorSignupRequest_email_status_idx" ON "DoctorSignupRequest"("email", "status");

-- CreateIndex
CREATE INDEX "DoctorSignupRequest_status_idx" ON "DoctorSignupRequest"("status");

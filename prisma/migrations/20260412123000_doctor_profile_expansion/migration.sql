-- Add richer doctor profile metadata and timeline tables
ALTER TABLE "Doctor" ADD COLUMN "bio" TEXT NOT NULL DEFAULT '';

CREATE TABLE "DoctorSpecialty" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorSpecialty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoctorHospitalHistory" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "hospitalName" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorHospitalHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoctorDegree" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "institution" TEXT,
  "year" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorDegree_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoctorAchievement" (
  "id" SERIAL NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "year" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorAchievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorSpecialty_doctorId_name_key" ON "DoctorSpecialty"("doctorId", "name");

ALTER TABLE "DoctorSpecialty"
  ADD CONSTRAINT "DoctorSpecialty_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorHospitalHistory"
  ADD CONSTRAINT "DoctorHospitalHistory_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorDegree"
  ADD CONSTRAINT "DoctorDegree_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorAchievement"
  ADD CONSTRAINT "DoctorAchievement_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single specialization and hospital into history tables
INSERT INTO "DoctorSpecialty" ("doctorId", "name")
SELECT "id", "specialization"
FROM "Doctor"
WHERE COALESCE(TRIM("specialization"), '') <> ''
ON CONFLICT ("doctorId", "name") DO NOTHING;

INSERT INTO "DoctorHospitalHistory" ("doctorId", "hospitalName", "startedAt")
SELECT "id", "hospitalName", CURRENT_TIMESTAMP
FROM "Doctor"
WHERE COALESCE(TRIM("hospitalName"), '') <> '';

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('STAKEHOLDER', 'CHARTER');

-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'STAKEHOLDER',
ALTER COLUMN "updatedAt" DROP DEFAULT;

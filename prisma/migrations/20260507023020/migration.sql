-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_sprintId_fkey";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Backlog',
ALTER COLUMN "sprintId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

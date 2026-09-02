-- AlterTable
ALTER TABLE "Ata" ADD COLUMN     "aprovadoPorUserId" TEXT,
ADD COLUMN     "elaboradoPorUserId" TEXT;

-- AlterTable
ALTER TABLE "AtaAcao" ADD COLUMN     "responsavelUserId" TEXT;

-- AlterTable
ALTER TABLE "AtaPresente" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Ata" ADD CONSTRAINT "Ata_elaboradoPorUserId_fkey" FOREIGN KEY ("elaboradoPorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ata" ADD CONSTRAINT "Ata_aprovadoPorUserId_fkey" FOREIGN KEY ("aprovadoPorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtaPresente" ADD CONSTRAINT "AtaPresente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtaAcao" ADD CONSTRAINT "AtaAcao_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

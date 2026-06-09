-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_sprintId_fkey";

-- CreateTable
CREATE TABLE "CardMovement" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT,
    "fromColumnId" TEXT,
    "fromColumnTitle" TEXT,
    "toColumnId" TEXT,
    "toColumnTitle" TEXT,
    "reason" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardMovement" ADD CONSTRAINT "CardMovement_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

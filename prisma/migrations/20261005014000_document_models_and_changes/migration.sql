ALTER TABLE "DocumentVersion" ADD COLUMN "changes" JSONB, ADD COLUMN "previousVersionId" TEXT;
ALTER TABLE "Ata" ADD COLUMN "instituicao" TEXT;

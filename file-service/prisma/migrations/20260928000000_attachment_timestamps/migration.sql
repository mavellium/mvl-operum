-- A fix_attachment_schema moveu para "files" a tabela public."Attachment" criada
-- pela migration init do app, que tem "uploadedAt" e nao tem "createdAt" nem
-- "updatedAt". O cliente Prisma do file-service grava e le essas duas colunas,
-- entao todo upload falhava no INSERT ("Falha ao registrar o anexo") e a
-- listagem de anexos (/files/by-cards) tambem quebrava.
--
-- Idempotente: bancos em que "files"."Attachment" ja nasceu com o formato do
-- file-service (db push, banco novo) nao sofrem alteracao. "uploadedAt" fica
-- onde existir (tem default e nada mais le a coluna).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'files' AND table_name = 'Attachment' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "files"."Attachment"
      ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'files' AND table_name = 'Attachment' AND column_name = 'uploadedAt'
    ) THEN
      EXECUTE 'UPDATE "files"."Attachment" SET "createdAt" = "uploadedAt"';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'files' AND table_name = 'Attachment' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "files"."Attachment"
      ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    EXECUTE 'UPDATE "files"."Attachment" SET "updatedAt" = "createdAt"';
    -- Igual ao schema do file-service: o Prisma preenche @updatedAt.
    ALTER TABLE "files"."Attachment" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

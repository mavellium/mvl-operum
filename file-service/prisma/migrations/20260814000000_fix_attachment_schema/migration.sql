-- A migration 20260421003957_init criava "Attachment" sem qualificacao de schema
-- (caia no schema public), enquanto o cliente Prisma multiSchema consulta
-- "files"."Attachment". Resultado em producao: o upload ao MinIO funciona, mas o
-- INSERT falha (P2021) e o anexo nunca e registrado. Esta migration corrige o
-- schema de bancos que aplicaram a init via `prisma migrate deploy`.

CREATE SCHEMA IF NOT EXISTS "files";

-- Move a tabela que ficou em public para o schema "files" (somente se o destino
-- ainda nao existir, para nao quebrar bancos criados via `prisma db push`).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Attachment'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'files' AND table_name = 'Attachment'
  ) THEN
    ALTER TABLE "public"."Attachment" SET SCHEMA "files";
  END IF;
END $$;

-- Garante a tabela no schema correto em bancos sem a tabela (idempotente).
CREATE TABLE IF NOT EXISTS "files"."Attachment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
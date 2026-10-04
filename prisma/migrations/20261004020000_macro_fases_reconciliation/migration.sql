ALTER TABLE "Project" ADD COLUMN "macroFasesRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "macroFasesSyncedRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "macroFasesSyncError" TEXT;
ALTER TABLE "ProjectMacroFase" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") - 1 AS position
  FROM "ProjectMacroFase"
)
UPDATE "ProjectMacroFase" f SET "position" = ordered.position FROM ordered WHERE f."id" = ordered."id";
ALTER TABLE "Project" ADD CONSTRAINT "Project_macro_fases_revision_valid"
CHECK ("macroFasesSyncedRevision" >= 0 AND "macroFasesRevision" >= "macroFasesSyncedRevision");

-- Scope first, then immutable traversal key. PostgreSQL owns these partial indexes.
CREATE INDEX "Card_backlog_page_idx" ON "Card" ("projectId", "createdAt", "id") WHERE "deletedAt" IS NULL AND "sprintId" IS NULL;
CREATE INDEX "Card_sprint_page_idx" ON "Card" ("sprintId", "createdAt", "id") WHERE "deletedAt" IS NULL;

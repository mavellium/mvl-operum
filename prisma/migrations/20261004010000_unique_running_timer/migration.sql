-- Fail closed on historical duplicates: do not guess which work interval to keep.
-- See docs/operations/timer-integrity.md for the read-only preflight.
BEGIN;

LOCK TABLE "TimeEntry" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT "userId"
    FROM "TimeEntry"
    WHERE "isRunning" = true AND "deletedAt" IS NULL
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Timers ativos duplicados: revise docs/operations/timer-integrity.md antes de aplicar a migration'
      USING ERRCODE = '23505';
  END IF;
END $$;

CREATE UNIQUE INDEX "TimeEntry_one_running_per_user"
ON "TimeEntry" ("userId")
WHERE "isRunning" = true AND "deletedAt" IS NULL;

COMMIT;

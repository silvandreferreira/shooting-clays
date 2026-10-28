-- The app keeps only Compak Sporting, Fosso and Helice (decision #68): other series are discarded.
DELETE FROM "sessions" WHERE "discipline" NOT IN ('compak', 'fosso', 'helice');--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_discipline_values" CHECK ("sessions"."discipline" in ('compak', 'fosso', 'helice'));
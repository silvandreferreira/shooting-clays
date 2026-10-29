-- Every series is at a club and on a field (decision #72). Series without a club were shot at
-- CCM; series without a field: Compak Sporting on Field 4, Fosso on Field 2, Helice on Field 1
-- (the only one with it).
UPDATE "sessions" SET "club_id" = 'ccm' WHERE "club_id" IS NULL;--> statement-breakpoint
UPDATE "sessions" SET "field_id" = CASE "discipline" WHEN 'compak' THEN '4' WHEN 'fosso' THEN '2' ELSE '1' END WHERE "field_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_field_needs_club";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "club_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "field_id" SET NOT NULL;
ALTER TABLE "profiles" ADD COLUMN "home_club_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "club_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "field_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_field_needs_club" CHECK ("sessions"."field_id" is null or "sessions"."club_id" is not null);
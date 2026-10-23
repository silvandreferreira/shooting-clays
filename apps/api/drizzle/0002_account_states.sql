ALTER TABLE "profiles" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_values" CHECK ("profiles"."role" in ('user', 'admin'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_status_values" CHECK ("profiles"."status" in ('pending', 'active', 'disabled'));
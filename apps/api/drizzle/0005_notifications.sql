CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notifications_kind_values" CHECK ("notifications"."kind" in ('registered', 'approved', 'revoked', 'signup', 'contact'))
);
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_status_values";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_status_values" CHECK ("profiles"."status" in ('pending', 'active', 'disabled', 'revoked'));
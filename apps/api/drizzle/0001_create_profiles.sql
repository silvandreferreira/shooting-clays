CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Sessions logged before iteration 2 belong to 'local'. Give them a placeholder profile so the
-- foreign key below holds; `pnpm db:assign-owner` moves them to the owner and removes it.
INSERT INTO "profiles" ("user_id", "display_name")
SELECT 'local', 'Local (pre-sign-in)'
WHERE EXISTS (SELECT 1 FROM "sessions" WHERE "user_id" = 'local');
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;
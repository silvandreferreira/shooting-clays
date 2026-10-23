CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"discipline" text NOT NULL,
	"score" smallint NOT NULL,
	"hardest_targets" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"import_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_import_key_unique" UNIQUE("import_key"),
	CONSTRAINT "sessions_score_range" CHECK ("sessions"."score" between 0 and 25)
);
--> statement-breakpoint
CREATE INDEX "sessions_user_id_date_idx" ON "sessions" USING btree ("user_id","date");
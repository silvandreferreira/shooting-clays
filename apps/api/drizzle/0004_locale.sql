ALTER TABLE "profiles" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_locale_values" CHECK ("profiles"."locale" in ('en', 'pt-PT'));
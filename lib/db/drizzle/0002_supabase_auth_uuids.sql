-- This automatic UUID conversion is intentionally limited to an empty vault.
-- If the read-only inventory finds existing founder or vault rows, stop and
-- replace this migration with an owner-reviewed legacy-ID-to-Supabase-UUID map.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "public"."vault_founders" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "public"."vault_credentials" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "public"."vault_favorites" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "public"."vault_activity" LIMIT 1)
		OR EXISTS (SELECT 1 FROM "public"."vault_sessions" LIMIT 1) THEN
		RAISE EXCEPTION 'NEXTAURA Vault contains data; a reviewed founder UUID mapping migration is required';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "public"."vault_credentials" DROP CONSTRAINT "vault_credentials_created_by_vault_founders_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" DROP CONSTRAINT "vault_favorites_founder_id_vault_founders_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."vault_activity" DROP CONSTRAINT "vault_activity_actor_id_vault_founders_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" DROP CONSTRAINT "vault_sessions_founder_id_vault_founders_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."vault_founders" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_credentials" ALTER COLUMN "created_by" SET DATA TYPE uuid USING "created_by"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" ALTER COLUMN "founder_id" SET DATA TYPE uuid USING "founder_id"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_activity" ALTER COLUMN "actor_id" SET DATA TYPE uuid USING "actor_id"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" ALTER COLUMN "founder_id" SET DATA TYPE uuid USING "founder_id"::uuid;--> statement-breakpoint
ALTER TABLE "public"."vault_founders" ADD CONSTRAINT "vault_founders_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_credentials" ADD CONSTRAINT "vault_credentials_created_by_vault_founders_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."vault_founders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" ADD CONSTRAINT "vault_favorites_founder_id_vault_founders_id_fk" FOREIGN KEY ("founder_id") REFERENCES "public"."vault_founders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_activity" ADD CONSTRAINT "vault_activity_actor_id_vault_founders_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."vault_founders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" ADD CONSTRAINT "vault_sessions_founder_id_vault_founders_id_fk" FOREIGN KEY ("founder_id") REFERENCES "public"."vault_founders"("id") ON DELETE cascade ON UPDATE no action;

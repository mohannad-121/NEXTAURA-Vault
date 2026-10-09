CREATE TABLE "public"."vault_founders" (
	"id" text PRIMARY KEY NOT NULL,
	"founder" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"allowed_divisions" text[] DEFAULT '{"agency","ai","studios","os"}' NOT NULL,
	"intro_seen" boolean DEFAULT false NOT NULL,
	"default_division" text DEFAULT 'agency' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_founders_founder_unique" UNIQUE("founder"),
	CONSTRAINT "vault_founders_founder_check" CHECK ("vault_founders"."founder" in ('mohannad', 'moayad')),
	CONSTRAINT "vault_founders_default_division_check" CHECK ("vault_founders"."default_division" in ('agency', 'ai', 'studios', 'os')),
	CONSTRAINT "vault_founders_allowed_divisions_check" CHECK ("vault_founders"."allowed_divisions" <@ array['agency', 'ai', 'studios', 'os']::text[])
);
--> statement-breakpoint
CREATE TABLE "public"."vault_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"division" text NOT NULL,
	"platform" text NOT NULL,
	"account_name" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_credentials_division_check" CHECK ("vault_credentials"."division" in ('agency', 'ai', 'studios', 'os'))
);
--> statement-breakpoint
CREATE TABLE "public"."vault_favorites" (
	"founder_id" text NOT NULL,
	"credential_id" uuid NOT NULL,
	CONSTRAINT "vault_favorites_founder_id_credential_id_pk" PRIMARY KEY("founder_id","credential_id")
);
--> statement-breakpoint
CREATE TABLE "public"."vault_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"division" text DEFAULT '' NOT NULL,
	"resource_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_activity_division_check" CHECK ("vault_activity"."division" in ('', 'agency', 'ai', 'studios', 'os'))
);
--> statement-breakpoint
CREATE TABLE "public"."vault_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"founder_id" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."vault_credentials" ADD CONSTRAINT "vault_credentials_created_by_vault_founders_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."vault_founders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" ADD CONSTRAINT "vault_favorites_founder_id_vault_founders_id_fk" FOREIGN KEY ("founder_id") REFERENCES "public"."vault_founders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" ADD CONSTRAINT "vault_favorites_credential_id_vault_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."vault_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_activity" ADD CONSTRAINT "vault_activity_actor_id_vault_founders_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."vault_founders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" ADD CONSTRAINT "vault_sessions_founder_id_vault_founders_id_fk" FOREIGN KEY ("founder_id") REFERENCES "public"."vault_founders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vault_credentials_division_updated_at_idx" ON "public"."vault_credentials" USING btree ("division","updated_at");--> statement-breakpoint
CREATE INDEX "vault_credentials_created_by_idx" ON "public"."vault_credentials" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "vault_favorites_credential_id_idx" ON "public"."vault_favorites" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "vault_activity_division_created_at_idx" ON "public"."vault_activity" USING btree ("division","created_at");--> statement-breakpoint
CREATE INDEX "vault_activity_actor_created_at_idx" ON "public"."vault_activity" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "vault_sessions_founder_id_idx" ON "public"."vault_sessions" USING btree ("founder_id");

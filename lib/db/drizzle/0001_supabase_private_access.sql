ALTER TABLE "public"."vault_founders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."vault_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."vault_favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."vault_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."vault_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- NEXTAURA Vault is server-only. Authenticated browsers never query the
-- Supabase Data API, so the public API roles receive no table privileges.
REVOKE ALL PRIVILEGES ON TABLE
	"public"."vault_founders",
	"public"."vault_credentials",
	"public"."vault_favorites",
	"public"."vault_activity",
	"public"."vault_sessions"
FROM PUBLIC, anon, authenticated, service_role;

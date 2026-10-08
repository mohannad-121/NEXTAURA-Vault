const definitions = [
  ["instagram", "Instagram", "https://www.instagram.com", "Social"],
  ["gmail", "Gmail", "https://mail.google.com", "Communication"],
  ["supabase", "Supabase", "https://supabase.com/dashboard", "Infrastructure"],
  ["render", "Render", "https://dashboard.render.com", "Infrastructure"],
  ["github", "GitHub", "https://github.com", "Development"],
  ["vercel", "Vercel", "https://vercel.com/dashboard", "Infrastructure"],
  ["replit", "Replit", "https://replit.com", "Development"],
  ["resend", "Resend", "https://resend.com", "Communication"],
  ["cloudflare", "Cloudflare", "https://dash.cloudflare.com", "Infrastructure"],
  ["godaddy", "GoDaddy", "https://account.godaddy.com", "Domains"],
  ["openai", "OpenAI", "https://platform.openai.com", "Intelligence"],
  ["anthropic", "Anthropic", "https://console.anthropic.com", "Intelligence"],
  ["gemini", "Gemini", "https://aistudio.google.com", "Intelligence"],
] as const;
export const platforms = definitions.map(([id, name, url, category]) => ({
  id, name, url, category, icon: `/platforms/${id}.svg`,
}));
export const divisions = ["agency", "ai", "studios", "os"] as const;

import type { Division, Platform } from '@workspace/api-client-react';

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
export const asset = (p: string) => `${basePath}/${p.replace(/^\//, '')}`;

export interface DivisionMeta {
  id: Division;
  name: string;
  short: string;
  logo: string;
  hsl: string;
  hsl2: string;
  mood: string;
}

export const DIVISIONS: Record<Division, DivisionMeta> = {
  agency: { id: 'agency', name: 'NextAura Agency', short: 'Agency', logo: asset('brands/NEXTAURA_AGENCY_1791477261098.png'), hsl: '43 62% 58%', hsl2: '36 70% 38%', mood: 'The parent house. Executive and exclusive.' },
  ai: { id: 'ai', name: 'NextAura AI', short: 'AI', logo: asset('brands/NEXTAURA_AI_1791477261097.png'), hsl: '258 85% 68%', hsl2: '222 90% 58%', mood: 'Intelligence infrastructure.' },
  studios: { id: 'studios', name: 'NextAura Studios', short: 'Studios', logo: asset('brands/NEXTAURA_STUDIOS_1791477261097.png'), hsl: '17 92% 56%', hsl2: '352 80% 44%', mood: 'Creative production.' },
  os: { id: 'os', name: 'NextAura OS', short: 'OS', logo: asset('brands/NEXTAURAOS_1791477261098.png'), hsl: '160 78% 46%', hsl2: '174 85% 38%', mood: 'The connected operating layer.' },
};
export const DIVISION_ORDER: Division[] = ['agency', 'ai', 'studios', 'os'];
export const isDivision = (v: string | undefined): v is Division => !!v && v in DIVISIONS;

export function resolvePlatform(key: string, platforms: Platform[] | undefined): Platform | undefined {
  const k = key.trim().toLowerCase();
  return platforms?.find((p) => p.id.toLowerCase() === k || p.name.toLowerCase() === k);
}
export const platformIconUrl = (id: string, p?: Platform) => asset(p?.icon || `/platforms/${id}.svg`);

export function errMessage(e: unknown): string {
  const x = e as { code?: string; message?: string; status?: number; data?: { error?: string; message?: string } | null };
  if (x?.code && /reverification|cancel/i.test(x.code)) return 'Second-factor verification was cancelled.';
  if (x?.status === 403) return x.data?.message || x.data?.error || 'Access denied. Re-verify your second factor and try again.';
  return x?.data?.message || x?.data?.error || x?.message || 'Something went wrong.';
}

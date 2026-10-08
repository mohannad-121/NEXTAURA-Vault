import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Activity as ActivityIcon, ArrowRight, KeyRound, LayoutGrid, Plus, Star } from 'lucide-react';
import { useGetPlatforms, useGetVaultActivity, useGetVaultSummary, useListCredentials } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { DIVISIONS, DIVISION_ORDER, isDivision, resolvePlatform } from '@/lib/brand';
import { DivisionLogo, PlatformLogo } from '@/components/vault/logos';
import { useVault } from '@/components/vault/context';
import { CardSkeletons, EmptyState, ErrorState } from '@/components/vault/states';
import { CredentialCard } from '@/components/vault/credential-card';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } } };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { session, openCreate } = useVault();
  const summary = useGetVaultSummary();
  const favs = useListCredentials({ favorites: true });
  const act = useGetVaultActivity();
  const { data: platforms } = useGetPlatforms();
  const s = summary.data;
  const first = session.name.split(' ')[0];

  const stats = [
    { l: 'Credentials', v: s?.credentialCount, i: KeyRound },
    { l: 'Platforms', v: s?.platformCount, i: LayoutGrid },
    { l: 'Favorites', v: s?.favoriteCount, i: Star },
    { l: 'Divisions', v: s?.divisionCount, i: ActivityIcon },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-12">
      <motion.section variants={rise} className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] brand-text">Command Center</p>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl" data-testid="text-greeting">{greeting()}, {first}.</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">Four divisions, one sealed vault. Select a house to enter its credentials.</p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => openCreate()} data-testid="button-add-dashboard"><Plus className="h-4 w-4" />Add credential</Button>
      </motion.section>

      <motion.section variants={rise} className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        {stats.map((x) => (
          <div key={x.l} className="glass rounded-2xl p-4 sm:p-5" data-testid={`stat-${x.l.toLowerCase()}`}>
            <div className="flex items-center justify-between text-muted-foreground"><span className="text-[11px] uppercase tracking-[0.22em]">{x.l}</span><x.i className="h-4 w-4 brand-text" /></div>
            {summary.isLoading ? <div className="skel mt-3 h-9 w-14" /> : <p className="tabular mt-2 font-display text-5xl">{x.v ?? '-'}</p>}
          </div>
        ))}
      </motion.section>

      {summary.isError && <ErrorState onRetry={() => void summary.refetch()} />}

      <motion.section variants={rise} aria-label="Ecosystem">
        <div className="mb-5 flex items-end justify-between"><h2 className="font-display text-3xl">The ecosystem</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DIVISION_ORDER.filter((d) => session.allowedDivisions.includes(d)).map((d) => {
            const m = DIVISIONS[d];
            const ds = s?.divisions.find((x) => x.division === d);
            return (
              <Link key={d} href={`/vault/${d}`} data-testid={`card-division-${d}`} style={{ ['--c' as string]: m.hsl, ['--c2' as string]: m.hsl2 }}
                className="group relative block overflow-hidden rounded-3xl border border-[hsl(var(--c)/.28)] p-5 transition duration-500 [background:radial-gradient(120%_80%_at_50%_0%,hsl(var(--c)/.13),hsl(var(--card)/.7)_65%)] hover:-translate-y-1.5 hover:border-[hsl(var(--c)/.65)] hover:shadow-[0_24px_50px_-24px_hsl(var(--c)/.55)]">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--c)/.8)] to-transparent opacity-60 transition group-hover:opacity-100" />
                <div className="relative mx-auto grid place-items-center py-1">
                  <div className="absolute h-32 w-32 rounded-full bg-[hsl(var(--c)/.18)] blur-2xl transition duration-500 group-hover:bg-[hsl(var(--c)/.34)]" />
                  <DivisionLogo division={d} size={150} className="relative transition duration-500 group-hover:scale-[1.05]" />
                  <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:[animation:sweep_1.4s_ease-in-out]" /></div>
                </div>
                <h3 className="relative mt-3 font-display text-2xl">{m.name}</h3>
                <div className="relative mt-3 flex items-end justify-between">
                  <div className="flex gap-5 text-xs text-muted-foreground">
                    <div><p className="tabular font-display text-3xl text-foreground" data-testid={`text-count-${d}`}>{ds?.credentialCount ?? 0}</p>credentials</div>
                    <div><p className="tabular font-display text-3xl text-foreground">{ds?.platformCount ?? 0}</p>platforms</div>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-[hsl(var(--c)/.4)] text-[hsl(var(--c))] transition group-hover:bg-[hsl(var(--c))] group-hover:text-background"><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      <div className="grid gap-10 xl:grid-cols-[1.6fr_1fr]">
        <motion.section variants={rise} aria-label="Favorites">
          <div className="mb-5 flex items-end justify-between"><h2 className="font-display text-3xl">Favorites</h2><Link href="/favorites" className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground" data-testid="link-all-favorites">View all</Link></div>
          {favs.isLoading ? <CardSkeletons n={2} /> : favs.isError ? <ErrorState onRetry={() => void favs.refetch()} /> : !favs.data?.length ? (
            <EmptyState title="No favorites yet" body="Star the accounts you reach for daily. They become one-click shortcuts here, and they are yours alone." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">{favs.data.slice(0, 4).map((c, i) => <CredentialCard key={c.id} c={c} platforms={platforms} index={i} />)}</div>
          )}
        </motion.section>

        <motion.section variants={rise} aria-label="Recent activity">
          <div className="mb-5 flex items-end justify-between"><h2 className="font-display text-3xl">Recent activity</h2><Link href="/activity" className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground" data-testid="link-all-activity">Full log</Link></div>
          <div className="glass rounded-3xl p-2">
            {act.isLoading ? <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-12" />)}</div> : act.isError ? <div className="p-4"><ErrorState onRetry={() => void act.refetch()} /></div> : !act.data?.length ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No activity recorded yet. Every reveal, edit and sign-in will be logged here without secret values.</p>
            ) : act.data.slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-[hsl(var(--brand)/.06)]" data-testid={`row-activity-${a.id}`}>
                {isDivision(a.division) ? <DivisionLogo division={a.division} size={30} crop={1.7} /> : <span className="grid h-[30px] w-[30px] place-items-center"><ActivityIcon className="h-4 w-4 text-muted-foreground" /></span>}
                <div className="min-w-0 flex-1"><p className="truncate text-sm">{a.action}</p><p className="truncate text-xs text-muted-foreground">{a.actor}</p></div>
                <time className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</time>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {platforms && platforms.length > 0 && (
        <motion.section variants={rise} aria-label="Platform directory">
          <div className="mb-5 flex items-end justify-between"><h2 className="font-display text-3xl">Platform directory</h2><Link href="/platforms" className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground" data-testid="link-all-platforms">Open directory</Link></div>
          <div className="flex flex-wrap gap-3">
            {platforms.map((p) => {
              const x = resolvePlatform(p.id, platforms);
              return <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" title={p.name} data-testid={`link-platform-${p.id}`} className="transition hover:-translate-y-1"><PlatformLogo id={p.id} name={p.name} platform={x} size={52} /></a>;
            })}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}

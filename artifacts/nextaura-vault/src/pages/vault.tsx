import { useMemo, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { Plus, Search, Star } from 'lucide-react';
import { useGetPlatforms, useListCredentials } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DIVISIONS, isDivision } from '@/lib/brand';
import { DivisionLogo } from '@/components/vault/logos';
import { useVault } from '@/components/vault/context';
import { CardSkeletons, EmptyState, ErrorState } from '@/components/vault/states';
import { CredentialCard } from '@/components/vault/credential-card';
import { cn } from '@/lib/utils';
import NotFound from '@/pages/not-found';

export default function VaultPage() {
  const params = useParams<{ division: string }>();
  const q0 = new URLSearchParams(useSearch()).get('q') ?? '';
  if (!isDivision(params.division)) return <NotFound />;
  return <VaultInner key={params.division} division={params.division} initialQuery={q0} />;
}

function VaultInner({ division, initialQuery }: { division: import('@workspace/api-client-react').Division; initialQuery: string }) {
  const { session, openCreate } = useVault();
  const m = DIVISIONS[division];
  const allowed = session.allowedDivisions.includes(division);
  const { data, isLoading, isError, error, refetch } = useListCredentials({ division });
  const { data: platforms } = useGetPlatforms();
  const [query, setQuery] = useState(initialQuery);
  const [onlyFav, setOnlyFav] = useState(false);

  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    return (data ?? []).filter((c) => (!onlyFav || c.favorite) && (!t || `${c.accountName} ${c.username} ${c.platform}`.toLowerCase().includes(t)));
  }, [data, query, onlyFav]);

  return (
    <div>
      <header className="glass relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full bg-[hsl(var(--brand)/.2)] blur-3xl transition-colors duration-1000" />
        <div className="relative flex flex-wrap items-center gap-6">
          <DivisionLogo division={division} size={116} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] brand-text">Division vault</p>
            <h1 className="mt-1 font-display text-4xl sm:text-5xl" data-testid="text-division-name">{m.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{isLoading ? 'Loading...' : `${data?.length ?? 0} stored ${data?.length === 1 ? 'credential' : 'credentials'}`} / {m.mood}</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => openCreate({ division })} disabled={!allowed} data-testid="button-add-credential"><Plus className="h-4 w-4" />Add credential</Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Filter ${m.short} accounts`} className="pl-9" data-testid="input-filter" />
        </div>
        <button type="button" onClick={() => setOnlyFav((f) => !f)} aria-pressed={onlyFav} data-testid="button-filter-favorites" className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition', onlyFav ? 'brand-border bg-[hsl(var(--brand)/.12)] text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
          <Star className={cn('h-4 w-4', onlyFav && 'fill-[hsl(var(--brand))] text-[hsl(var(--brand))]')} />Favorites
        </button>
      </div>

      {!allowed ? (
        <EmptyState division={division} title="Division not authorized" body="Your founder access does not include this division. Access is managed in Settings by an authorized founder." />
      ) : isLoading ? <CardSkeletons /> : isError ? <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} /> : !data?.length ? (
        <EmptyState division={division} title={`${m.short} vault is empty`} body={`No credentials are stored for ${m.name}. Add the first account and it is encrypted on the server the moment you save.`} action={<Button className="gap-2" onClick={() => openCreate({ division })} data-testid="button-add-first"><Plus className="h-4 w-4" />Store first credential</Button>} />
      ) : !list.length ? (
        <EmptyState division={division} title="No matches" body="Nothing in this division fits that filter." action={<Button variant="outline" onClick={() => { setQuery(''); setOnlyFav(false); }} data-testid="button-clear-filter">Clear filters</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><AnimatePresence>{list.map((c, i) => <CredentialCard key={c.id} c={c} platforms={platforms} index={i} />)}</AnimatePresence></div>
      )}
    </div>
  );
}

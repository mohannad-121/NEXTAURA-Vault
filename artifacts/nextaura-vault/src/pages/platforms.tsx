import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Plus, Search } from 'lucide-react';
import { useGetPlatforms, useListCredentials } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlatformLogo } from '@/components/vault/logos';
import { useVault } from '@/components/vault/context';
import { EmptyState, ErrorState, PageHeader } from '@/components/vault/states';
import { resolvePlatform } from '@/lib/brand';

export default function Platforms() {
  const { openCreate, division } = useVault();
  const { data, isLoading, isError, refetch } = useGetPlatforms();
  const creds = useListCredentials();
  const [q, setQ] = useState('');
  const list = useMemo(() => (data ?? []).filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  const countFor = (id: string) => (creds.data ?? []).filter((c) => resolvePlatform(c.platform, data)?.id === id).length;
  return (
    <div>
      <PageHeader eyebrow="Service catalog" title="Platform directory" right={
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search platforms" className="pl-9" data-testid="input-platform-search" /></div>
      }>Every service the NextAura divisions run on. Open the platform, or store a new account against it.</PageHeader>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel h-[148px] rounded-2xl" />)}</div>
      ) : isError ? <ErrorState onRetry={() => void refetch()} /> : !list.length ? (
        <EmptyState title="No platform found" body="Nothing in the catalog matches that search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.5 }} className="glass group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-[hsl(var(--brand)/.4)]" data-testid={`card-platform-${p.id}`}>
              <div className="flex items-center gap-4">
                <PlatformLogo id={p.id} name={p.name} platform={p} size={56} />
                <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{p.name}</h3><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{p.category}</p></div>
                <div className="text-right"><p className="tabular font-display text-3xl">{countFor(p.id)}</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">accounts</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 gap-2"><a href={p.url} target="_blank" rel="noopener noreferrer" data-testid={`link-open-platform-${p.id}`}>Open<ExternalLink className="h-3.5 w-3.5" /></a></Button>
                <Button size="sm" className="flex-1 gap-2" onClick={() => openCreate({ division, platform: p.id })} data-testid={`button-add-for-${p.id}`}><Plus className="h-3.5 w-3.5" />Add account</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

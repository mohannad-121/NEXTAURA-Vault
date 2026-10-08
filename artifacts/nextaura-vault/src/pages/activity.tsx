import { useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Activity as ActivityIcon } from 'lucide-react';
import { useGetVaultActivity, type Activity } from '@workspace/api-client-react';
import { isDivision, DIVISIONS } from '@/lib/brand';
import { DivisionLogo } from '@/components/vault/logos';
import { EmptyState, ErrorState, PageHeader } from '@/components/vault/states';

export default function ActivityPage() {
  const { data, isLoading, isError, refetch } = useGetVaultActivity();
  const groups = useMemo(() => {
    const m = new Map<string, Activity[]>();
    (data ?? []).forEach((a) => {
      const d = new Date(a.createdAt);
      const k = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMMM yyyy');
      m.set(k, [...(m.get(k) ?? []), a]);
    });
    return [...m.entries()];
  }, [data]);
  return (
    <div>
      <PageHeader eyebrow="Audit trail" title="Activity">A record of who did what, and where. Secret values are never written to this log.</PageHeader>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel h-16" />)}</div> : isError ? <ErrorState onRetry={() => void refetch()} /> : !groups.length ? (
        <EmptyState title="A quiet ledger" body="Nothing has been recorded yet. Reveals, edits, deletions and backups will appear here with who did them." />
      ) : groups.map(([day, items]) => (
        <section key={day} className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{day}</h2>
          <ol className="glass divide-y divide-border/60 rounded-3xl">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5" data-testid={`row-activity-${a.id}`}>
                {isDivision(a.division) ? <DivisionLogo division={a.division} size={36} crop={1.7} /> : <span className="grid h-9 w-9 place-items-center rounded-full border border-border"><ActivityIcon className="h-4 w-4 text-muted-foreground" /></span>}
                <div className="min-w-0 flex-1"><p className="text-sm">{a.action}</p><p className="text-xs text-muted-foreground">{a.actor}{isDivision(a.division) ? ` / ${DIVISIONS[a.division].short}` : a.division ? ` / ${a.division}` : ''}</p></div>
                <time className="tabular shrink-0 text-xs text-muted-foreground">{format(new Date(a.createdAt), 'HH:mm')}</time>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

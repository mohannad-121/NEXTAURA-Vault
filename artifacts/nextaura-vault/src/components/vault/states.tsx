import type { ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DivisionLogo } from './logos';
import type { Division } from '@workspace/api-client-react';

export function EmptyState({ division = 'agency', title, body, action }: { division?: Division; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="glass relative overflow-hidden rounded-3xl px-6 py-14 text-center" data-testid="empty-state">
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: 'hsl(var(--brand))' }} />
      <div className="relative mx-auto mb-5 w-fit opacity-90"><DivisionLogo division={division} size={84} /></div>
      <h3 className="relative font-display text-3xl">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="relative mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="glass rounded-3xl px-6 py-12 text-center" data-testid="error-state">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-display text-2xl">This section did not load</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{message ?? 'The vault could not be reached. Nothing was changed.'}</p>
      <Button variant="outline" className="mt-5" onClick={onRetry} data-testid="button-retry"><RotateCw className="mr-2 h-4 w-4" />Try again</Button>
    </div>
  );
}

export function CardSkeletons({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: n }, (_, i) => <div key={i} className="skel h-[210px] rounded-2xl" />)}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, right }: { eyebrow: string; title: string; children?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] brand-text">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-4xl sm:text-5xl">{title}</h1>
        {children && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{children}</p>}
      </div>
      {right}
    </header>
  );
}

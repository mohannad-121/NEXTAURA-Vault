import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import { useFavoriteCredential, type Credential, type Platform } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCredentialDelete, useRefreshVault, useRevealSecret } from '@/hooks/use-vault-ops';
import { DIVISIONS, errMessage, resolvePlatform } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { DivisionLogo, PlatformLogo } from './logos';
import { useVault } from './context';

const REVEAL_MS = 20000;

function IconBtn({ label, onClick, children, disabled, active, testid, danger }: { label: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean; active?: boolean; testid: string; danger?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} data-testid={testid}
      className={cn('grid h-8 w-8 place-items-center rounded-lg border border-transparent text-muted-foreground transition hover:border-[hsl(var(--brand)/.3)] hover:bg-[hsl(var(--brand)/.1)] hover:text-foreground disabled:opacity-40', active && 'text-[hsl(var(--brand))]', danger && 'hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive')}>
      {children}
    </button>
  );
}

export function CredentialCard({ c, platforms, index = 0 }: { c: Credential; platforms?: Platform[]; index?: number }) {
  const { openEdit } = useVault();
  const { toast } = useToast();
  const refresh = useRefreshVault();
  const p = resolvePlatform(c.platform, platforms);
  const name = p?.name ?? c.platform;
  const d = DIVISIONS[c.division];
  const reveal = useRevealSecret();
  const del = useCredentialDelete();
  const fav = useFavoriteCredential();
  const [secret, setSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(() => { clearTimeout(timer.current); setSecret(null); }, []);
  useEffect(() => {
    if (!secret) return;
    const hide = () => clear();
    const vis = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('blur', hide); document.removeEventListener('visibilitychange', vis); };
  }, [secret, clear]);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function fetchSecret(): Promise<string | null> {
    try { return await reveal.run(c.id); } catch (e) { toast({ title: 'Reveal blocked', description: errMessage(e), variant: 'destructive' }); return null; }
  }
  async function toggleReveal() {
    if (secret) return clear();
    const pw = await fetchSecret();
    if (pw == null) return;
    setSecret(pw);
    clearTimeout(timer.current);
    timer.current = setTimeout(clear, REVEAL_MS);
  }
  async function copyPassword() {
    const pw = secret ?? (await fetchSecret());
    if (pw == null) return;
    try { await navigator.clipboard.writeText(pw); toast({ title: 'Password copied', description: 'Clipboard holds a secret. Clear it when finished.' }); } catch { toast({ title: 'Copy failed', variant: 'destructive' }); }
    if (!secret) clear();
  }
  async function copyUser() {
    try { await navigator.clipboard.writeText(c.username); toast({ title: 'Username copied' }); } catch { toast({ title: 'Copy failed', variant: 'destructive' }); }
  }
  function toggleFav() {
    fav.mutate({ id: c.id, data: { favorite: !c.favorite } }, { onSuccess: () => void refresh(), onError: (e) => toast({ title: 'Could not update favorite', description: errMessage(e), variant: 'destructive' }) });
  }
  async function remove() {
    try { await del.run(c.id); toast({ title: 'Credential deleted', description: c.accountName }); setConfirm(false); } catch (e) { toast({ title: 'Delete blocked', description: errMessage(e), variant: 'destructive' }); }
  }

  return (
    <motion.article layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass group relative overflow-hidden rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--brand)/.4)]" data-testid={`card-credential-${c.id}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 hairline opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start gap-3">
        <PlatformLogo id={p?.id ?? c.platform} name={name} platform={p} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold" data-testid={`text-account-${c.id}`}>{c.accountName}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{name}</span><span className="opacity-40">/</span>
            <span className="flex items-center gap-1"><DivisionLogo division={c.division} size={16} crop={1.7} />{d.short}</span>
          </div>
        </div>
        <button type="button" onClick={toggleFav} aria-label={c.favorite ? 'Remove favorite' : 'Add favorite'} aria-pressed={c.favorite} data-testid={`button-favorite-${c.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:text-[hsl(var(--brand))]">
          <Star className={cn('h-[18px] w-[18px] transition', c.favorite && 'fill-[hsl(var(--brand))] text-[hsl(var(--brand))]')} />
        </button>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-background/45 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[13px] text-foreground/90" data-testid={`text-username-${c.id}`}>{c.username}</span>
          <IconBtn label="Copy username" onClick={copyUser} testid={`button-copy-username-${c.id}`}><Copy className="h-4 w-4" /></IconBtn>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <span className="flex min-w-0 items-center gap-2 font-mono text-[13px]" data-testid={`text-password-${c.id}`}>
            <KeyRound className="h-3.5 w-3.5 shrink-0 brand-text" />
            <span className={cn('truncate', secret ? 'select-all text-foreground' : 'tracking-[0.25em] text-muted-foreground')}>{secret ?? '••••••••••••'}</span>
          </span>
          <div className="flex shrink-0">
            <IconBtn label={secret ? 'Hide password' : 'Reveal password'} onClick={toggleReveal} disabled={reveal.pending} testid={`button-reveal-${c.id}`}>
              {reveal.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Copy password" onClick={copyPassword} disabled={reveal.pending} testid={`button-copy-password-${c.id}`}><Copy className="h-4 w-4" /></IconBtn>
          </div>
        </div>
        {secret && <div className="h-px overflow-hidden bg-border"><div key={secret} className="h-full origin-left brand-bg" style={{ animation: `shrink ${REVEAL_MS}ms linear forwards` }} /></div>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {p?.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer" data-testid={`link-open-${c.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-[hsl(var(--brand)/.1)] hover:text-foreground">
            Open {name}<ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : <span />}
        <div className="flex">
          <IconBtn label="Edit credential" onClick={() => openEdit(c)} testid={`button-edit-${c.id}`}><Pencil className="h-4 w-4" /></IconBtn>
          <IconBtn label="Delete credential" onClick={() => setConfirm(true)} testid={`button-delete-${c.id}`} danger><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">Delete this credential?</AlertDialogTitle>
            <AlertDialogDescription>{c.accountName} ({name}, {d.name}) and its encrypted password will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void remove(); }} disabled={del.pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              {del.pending ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.article>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/provider';
import { Activity as ActivityIcon, Command as CommandIcon, LayoutDashboard, LayoutGrid, Loader2, Lock, Menu, Plus, Search, Settings, Star } from 'lucide-react';
import {
  getGetPlatformsQueryKey, getGetVaultSessionQueryKey, getListCredentialsQueryKey, useGetPlatforms, useListCredentials, useLockVault, useUpdateVaultSettings,
  type Credential, type Division, type VaultSession,
} from '@workspace/api-client-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { DIVISIONS, DIVISION_ORDER, isDivision, resolvePlatform } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { Ambient } from './ambient';
import { VaultContext } from './context';
import { CredentialDialog, type DialogState } from './credential-dialog';
import { Intro } from './intro';
import { DivisionLogo, PlatformLogo, VaultLogo, Wordmark } from './logos';

const IDLE_MS = 15 * 60 * 1000;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const [loc] = useLocation();
  const item = (href: string, label: string, icon: ReactNode, active: boolean, tid: string, brand?: Division) => (
    <Link key={href} href={href} onClick={onNavigate} data-testid={tid}
      className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'text-foreground' : 'text-sidebar-foreground/70 hover:text-foreground')}>
      {active && <motion.span layoutId="nav-active" transition={{ type: 'spring', stiffness: 420, damping: 38 }} className="absolute inset-0 rounded-xl border border-[hsl(var(--brand)/.35)] bg-[hsl(var(--brand)/.1)]"><span className="absolute -left-px top-2.5 bottom-2.5 w-[2px] rounded-full brand-bg" /></motion.span>}
      <span className="relative z-10 grid h-6 w-6 place-items-center">{brand ? <DivisionLogo division={brand} size={26} crop={1.7} /> : icon}</span>
      <span className="relative z-10">{label}</span>
    </Link>
  );
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {item('/dashboard', 'Command Center', <LayoutDashboard className="h-[18px] w-[18px]" />, loc === '/dashboard', 'link-nav-dashboard')}
      <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Divisions</p>
      {DIVISION_ORDER.map((d) => item(`/vault/${d}`, DIVISIONS[d].name, null, loc === `/vault/${d}`, `link-nav-${d}`, d))}
      <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Vault</p>
      {item('/favorites', 'Favorites', <Star className="h-[18px] w-[18px]" />, loc === '/favorites', 'link-nav-favorites')}
      {item('/platforms', 'Platform Directory', <LayoutGrid className="h-[18px] w-[18px]" />, loc === '/platforms', 'link-nav-platforms')}
      {item('/activity', 'Activity', <ActivityIcon className="h-[18px] w-[18px]" />, loc === '/activity', 'link-nav-activity')}
      {item('/settings', 'Settings', <Settings className="h-[18px] w-[18px]" />, loc === '/settings', 'link-nav-settings')}
    </nav>
  );
}

function Palette({ open, setOpen, openCreate }: { open: boolean; setOpen: (o: boolean) => void; openCreate: () => void }) {
  const [, nav] = useLocation();
  const { data: creds } = useListCredentials(undefined, { query: { enabled: open, queryKey: getListCredentialsQueryKey() } });
  const { data: platforms } = useGetPlatforms({ query: { enabled: open, queryKey: getGetPlatformsQueryKey() } });
  const go = (to: string) => { setOpen(false); nav(to); };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search accounts, platforms, divisions, actions..." data-testid="input-command" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Nothing matches that.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { setOpen(false); openCreate(); }}><Plus className="mr-2 h-4 w-4" />Add credential</CommandItem>
          <CommandItem onSelect={() => go('/settings')}><Settings className="mr-2 h-4 w-4" />Open settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Command Center</CommandItem>
          {DIVISION_ORDER.map((d) => <CommandItem key={d} onSelect={() => go(`/vault/${d}`)}><DivisionLogo division={d} size={22} crop={1.7} className="mr-2" />{DIVISIONS[d].name}</CommandItem>)}
          <CommandItem onSelect={() => go('/favorites')}><Star className="mr-2 h-4 w-4" />Favorites</CommandItem>
          <CommandItem onSelect={() => go('/platforms')}><LayoutGrid className="mr-2 h-4 w-4" />Platform Directory</CommandItem>
          <CommandItem onSelect={() => go('/activity')}><ActivityIcon className="mr-2 h-4 w-4" />Activity</CommandItem>
        </CommandGroup>
        {creds && creds.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Accounts">
              {creds.slice(0, 60).map((c: Credential) => {
                const p = resolvePlatform(c.platform, platforms);
                return (
                  <CommandItem key={c.id} value={`${c.accountName} ${c.username} ${p?.name ?? c.platform} ${DIVISIONS[c.division].short}`} onSelect={() => go(`/vault/${c.division}?q=${encodeURIComponent(c.accountName)}`)}>
                    <PlatformLogo id={p?.id ?? c.platform} name={p?.name ?? c.platform} platform={p} size={24} className="mr-2 rounded-md" />
                    <span className="truncate">{c.accountName}</span>
                    <CommandShortcut>{DIVISIONS[c.division].short}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function Shell({ session, children }: { session: VaultSession; children: ReactNode }) {
  const [loc, setLoc] = useLocation();
  const qc = useQueryClient();
  const auth = useAuth();
  const lockM = useLockVault();
  const settingsM = useUpdateVaultSettings();
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [intro, setIntro] = useState(!session.introSeen);
  const [revealed, setRevealed] = useState(session.introSeen);
  const [locking, setLocking] = useState(false);

  const division = useMemo<Division>(() => {
    const m = /^\/vault\/([a-z]+)/.exec(loc);
    return m && isDivision(m[1]) ? m[1] : session.defaultDivision;
  }, [loc, session.defaultDivision]);

  useEffect(() => {
    document.documentElement.dataset.division = division;
    return () => { document.documentElement.dataset.division = 'agency'; };
  }, [division]);

  const lock = useCallback(async () => {
    setLocking(true);
    try { await lockM.mutateAsync(); } catch { /* server session may already be gone */ }
    qc.clear();
    await auth.signOut();
  }, [lockM, qc, auth]);
  const lockRef = useRef(lock);
  lockRef.current = lock;

  useEffect(() => {
    let t = setTimeout(() => void lockRef.current(), IDLE_MS);
    const reset = () => { clearTimeout(t); t = setTimeout(() => void lockRef.current(), IDLE_MS); };
    const ev = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const;
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const finishIntro = useCallback(() => {
    setIntro(false);
    setRevealed(true);
    if (!session.introSeen) {
      settingsM.mutate({ data: { introSeen: true } }, {
        onSuccess: () => qc.setQueryData(getGetVaultSessionQueryKey(), (old: VaultSession | undefined) => (old ? { ...old, introSeen: true } : old)),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.introSeen, qc]);

  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setRevealed(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 3400);
    return () => clearTimeout(t);
  }, [intro]);

  const ctx = useMemo(() => ({
    session, division, locking, lock: () => void lock(),
    openCreate: (preset?: { division?: Division; platform?: string }) => setDialog({ open: true, preset }),
    openEdit: (c: Credential) => setDialog({ open: true, edit: c }),
    openPalette: () => setPalette(true),
    replayIntro: () => { setRevealed(false); setIntro(true); setLoc('/dashboard'); },
  }), [session, division, locking, lock, setLoc]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" onClick={onNavigate} className="mb-7 flex items-center gap-3 px-2" data-testid="link-home">
        <VaultLogo size={48} />
        <div className="leading-tight"><Wordmark className="block text-[.78rem]" /><span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Founders only</span></div>
      </Link>
      <div className="-mx-1 flex-1 overflow-y-auto px-1"><NavList onNavigate={onNavigate} /></div>
      <div className="mt-4 border-t border-sidebar-border pt-4">
        <div className="mb-3 px-2"><p className="truncate text-sm font-semibold" data-testid="text-founder-name">{session.name}</p><p className="truncate text-xs text-muted-foreground">{session.founder}</p></div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => void lock()} disabled={locking} data-testid="button-lock-vault">
          {locking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}Lock vault
        </Button>
      </div>
    </div>
  );

  return (
    <VaultContext.Provider value={ctx}>
      <div className="grain min-h-[100dvh]">
        <Ambient division={division} />
        <AnimatePresence>{revealed && (
          <>
            <motion.aside initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-sidebar-border bg-sidebar/70 p-5 backdrop-blur-xl lg:block">{sidebar()}</motion.aside>
            <div className="lg:pl-[264px]">
              <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl sm:px-8">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Open navigation" data-testid="button-menu"><Menu className="h-5 w-5" /></Button>
                <button type="button" onClick={() => setPalette(true)} data-testid="button-search" className="group flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-card/60 px-3.5 text-left text-sm text-muted-foreground transition hover:border-[hsl(var(--brand)/.4)] sm:max-w-md">
                  <Search className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">Search the vault</span>
                  <kbd className="hidden items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] sm:flex"><CommandIcon className="h-3 w-3" />K</kbd>
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <Button onClick={() => ctx.openCreate({ division })} className="gap-2" data-testid="button-quick-add"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add credential</span></Button>
                </div>
              </motion.header>
              <motion.main key={loc.split('?')[0]} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10">
                {children}
              </motion.main>
            </div>
          </>
        )}</AnimatePresence>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="left" className="w-[290px] border-sidebar-border bg-sidebar p-5"><SheetTitle className="sr-only">Navigation</SheetTitle>{sidebar(() => setMenu(false))}</SheetContent>
        </Sheet>
        <Palette open={palette} setOpen={setPalette} openCreate={() => ctx.openCreate({ division })} />
        <CredentialDialog state={dialog} onClose={() => setDialog((s) => ({ ...s, open: false }))} />
        {intro && <Intro onDone={finishIntro} />}
      </div>
    </VaultContext.Provider>
  );
}

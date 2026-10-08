import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, KeyRound, Loader2, LogOut, ShieldCheck, Smartphone, UserCheck } from 'lucide-react';
import { UserProfile, useClerk, useSession, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetVaultSessionQueryKey, useGetVaultSession, type VaultSession } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { basePath, errMessage } from '@/lib/brand';
import { clerkAppearance } from '@/lib/clerk';
import { Ambient } from './ambient';
import { DivisionLogo, Wordmark } from './logos';
import { ErrorState } from './states';
import { Shell } from './shell';

const STEPS = [
  { key: 'access_pending', label: 'Founder authorization', icon: UserCheck },
  { key: 'mfa_required', label: 'Authenticator enrollment', icon: Smartphone },
  { key: 'mfa_verification_required', label: 'Second-factor verification', icon: KeyRound },
  { key: 'encryption_required', label: 'Server encryption', icon: ShieldCheck },
] as const;

function Frame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grain relative min-h-[100dvh]">
      <Ambient division="agency" />
      <div className={`mx-auto flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-10 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>{children}</div>
    </div>
  );
}

function SignOutLink() {
  const clerk = useClerk();
  const qc = useQueryClient();
  return (
    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => { qc.clear(); void clerk.signOut({ redirectUrl: basePath || '/' }); }} data-testid="button-sign-out">
      <LogOut className="h-4 w-4" />Sign out
    </Button>
  );
}

function OwnId() {
  const { user } = useUser();
  const [done, setDone] = useState(false);
  if (!user) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-background/50 p-4 text-sm" data-testid="own-id-panel">
      <p className="text-muted-foreground">Send this account identifier to the project owner so it can be bound as a founder. Each founder must sign in with their own separate account; the vault never grants itself access.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-card px-3 py-2 font-mono text-xs" data-testid="text-own-id">{user.id}</code>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { void navigator.clipboard.writeText(user.id).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); }); }} data-testid="button-copy-own-id">{done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{done ? 'Copied' : 'Copy'}</Button>
      </div>
    </div>
  );
}

function SecurityProfile() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl">
      <UserProfile routing="hash" appearance={{ ...clerkAppearance, elements: { ...clerkAppearance.elements, rootBox: 'w-full', cardBox: 'w-full max-w-full rounded-2xl border border-border shadow-none' } }} />
    </div>
  );
}

function TotpVerify({ onDone }: { onDone: () => void }) {
  const { session } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true); setErr('');
    try {
      const v = await session.startVerification({ level: 'second_factor' });
      if (v.status === 'needs_second_factor') await session.attemptSecondFactorVerification({ strategy: 'totp', code: code.trim() });
      await session.reload();
      onDone();
    } catch (x) { setErr(errMessage(x)); } finally { setBusy(false); setCode(''); }
  }
  return (
    <form onSubmit={go} className="mt-6 space-y-3">
      <Input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))} placeholder="6-digit authenticator code" className="h-12 text-center font-mono text-lg tracking-[0.4em]" data-testid="input-totp" />
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="h-11 w-full" disabled={code.length < 6 || busy} data-testid="button-verify-totp">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify and continue</Button>
    </form>
  );
}

function Blocker({ session, recheck, checking }: { session: VaultSession; recheck: () => void; checking: boolean }) {
  const idx = STEPS.findIndex((s) => s.key === session.status);
  const copy: Record<string, { t: string; b: string }> = {
    access_pending: { t: 'Access pending', b: 'This account is not bound to a founder identity. Only the two NextAura founders can open the vault, and access is assigned by the vault operator. Nothing here is available until that binding exists.' },
    mfa_required: { t: 'Enroll an authenticator', b: 'A time-based authenticator app is mandatory. Open Security below, add an authenticator application, then confirm to continue.' },
    mfa_verification_required: { t: 'Verify your second factor', b: 'Enter the current code from your authenticator app. Sensitive actions will ask again whenever the last verification is older than five minutes.' },
    encryption_required: { t: 'Server encryption is not ready', b: 'The vault refuses to open until server-side encryption is configured. This is a deployment matter for the operator, not something to work around.' },
  };
  const c = copy[session.status];
  return (
    <Frame wide={session.status === 'mfa_required' || session.status === 'access_pending'}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="glass w-full rounded-3xl p-7 sm:p-9" data-testid={`blocker-${session.status}`}>
        <div className="flex items-center gap-3"><DivisionLogo division="agency" size={52} /><Wordmark className="text-xs" /></div>
        <ol className="my-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] leading-tight ${i === idx ? 'border-[hsl(var(--brand)/.5)] bg-[hsl(var(--brand)/.1)] text-foreground' : i < idx ? 'border-border text-muted-foreground' : 'border-border/50 text-muted-foreground/60'}`}>
              {i < idx ? <Check className="h-4 w-4 shrink-0 brand-text" /> : <s.icon className="h-4 w-4 shrink-0" />}{s.label}
            </li>
          ))}
        </ol>
        <h1 className="font-display text-4xl">{c.t}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
        {session.status === 'mfa_required' && <SecurityProfile />}
        {session.status === 'access_pending' && <><OwnId /><details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer text-foreground" data-testid="button-open-security">Set up my authenticator now</summary><SecurityProfile /></details></>}
        {session.status === 'mfa_verification_required' && <TotpVerify onDone={recheck} />}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <SignOutLink />
          {session.status !== 'mfa_verification_required' && (
            <Button variant="outline" onClick={recheck} disabled={checking} data-testid="button-recheck">{checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{session.status === 'mfa_required' ? 'I have enrolled, continue' : 'Check again'}</Button>
          )}
        </div>
      </motion.div>
    </Frame>
  );
}

export function VaultGate({ children }: { children: (s: VaultSession) => ReactNode }) {
  const q = useGetVaultSession({ query: { queryKey: getGetVaultSessionQueryKey(), retry: false, refetchOnWindowFocus: true } });
  const { data, isLoading, isError, error, refetch, isFetching } = q;

  if (isLoading) {
    return (
      <Frame>
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} className="flex flex-col items-center gap-5" data-testid="gate-loading">
          <DivisionLogo division="agency" size={120} />
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Securing session</p>
        </motion.div>
      </Frame>
    );
  }
  if (isError || !data) {
    return (
      <Frame>
        <div className="w-full"><ErrorState message={errMessage(error)} onRetry={() => void refetch()} /><div className="mt-3 flex justify-center"><SignOutLink /></div></div>
      </Frame>
    );
  }
  if (data.status !== 'ready') return <Blocker session={data} recheck={() => void refetch()} checking={isFetching} />;
  return <Shell session={data}>{children(data)}</Shell>;
}

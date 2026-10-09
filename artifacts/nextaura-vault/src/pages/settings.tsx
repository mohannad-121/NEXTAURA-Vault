import { useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Film, Loader2, Lock, ShieldCheck, Upload, UserRound } from 'lucide-react';
import {
  getGetVaultSessionQueryKey, useGetFounderAccess, useUpdateVaultSettings,
  type BackupEnvelope, type Division, type VaultSession,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAccessWrite, useBackupOps } from '@/hooks/use-vault-ops';
import { DIVISIONS, DIVISION_ORDER, errMessage } from '@/lib/brand';
import { useAuth } from '@/components/auth/provider';
import { AuthenticatorManager } from '@/components/auth/totp';
import { DivisionLogo } from '@/components/vault/logos';
import { useVault } from '@/components/vault/context';
import { ErrorState, PageHeader } from '@/components/vault/states';

function Section({ icon, title, children, tid }: { icon: ReactNode; title: string; children: ReactNode; tid: string }) {
  return (
    <section className="glass rounded-3xl p-6 sm:p-7" data-testid={tid}>
      <h2 className="mb-5 flex items-center gap-3 font-display text-2xl"><span className="grid h-9 w-9 place-items-center rounded-xl border brand-border bg-[hsl(var(--brand)/.08)] brand-text">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}
const Row = ({ l, children }: { l: string; children: ReactNode }) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 py-3.5 first:border-0 first:pt-0"><span className="text-sm text-muted-foreground">{l}</span><div className="text-sm">{children}</div></div>;

function FounderAccessPanel() {
  const { session } = useVault();
  const { data, isLoading, isError, error, refetch } = useGetFounderAccess();
  const write = useAccessWrite();
  const { toast } = useToast();
  async function save(id: string, active: boolean, allowed: Division[]) {
    try { await write.run(id, { active, allowedDivisions: allowed }); toast({ title: 'Founder access updated' }); } catch (e) { toast({ title: 'Update blocked', description: errMessage(e), variant: 'destructive' }); }
  }
  if (isLoading) return <div className="skel h-32" />;
  if (isError) return <ErrorState message={errMessage(error)} onRetry={() => void refetch()} />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No founder records exist yet.</p>;
  return (
    <div className="space-y-4">
      {data.map((f) => (
        <div key={f.id} className="rounded-2xl border border-border bg-background/40 p-4" data-testid={`access-${f.id}`}>
          <div className="flex items-center justify-between gap-3">
            <div><p className="font-semibold">{f.name}</p><p className="text-xs text-muted-foreground">{f.founder}</p></div>
             <label className="flex items-center gap-2 text-xs text-muted-foreground">{f.active ? 'Active' : 'Suspended'}<Switch checked={f.active} disabled={write.pending || f.founder === session.founder} onCheckedChange={(v) => void save(f.id, v, f.allowedDivisions)} data-testid={`switch-active-${f.id}`} /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {DIVISION_ORDER.map((d) => {
              const on = f.allowedDivisions.includes(d);
              return (
                 <button key={d} type="button" disabled={write.pending || f.founder === session.founder} aria-pressed={on} data-testid={`toggle-${f.id}-${d}`}
                  onClick={() => void save(f.id, f.active, on ? f.allowedDivisions.filter((x) => x !== d) : [...f.allowedDivisions, d])}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition ${on ? 'border-[hsl(var(--brand)/.5)] bg-[hsl(var(--brand)/.1)] text-foreground' : 'border-border text-muted-foreground opacity-70 hover:opacity-100'}`}>
                  <DivisionLogo division={d} size={20} crop={1.7} />{DIVISIONS[d].short}
                </button>
              );
            })}
           </div>
           {f.founder === session.founder && <p className="mt-3 text-xs text-muted-foreground">Your own access is read-only here. Ask the other founder to change it.</p>}
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { session, replayIntro, lock, locking } = useVault();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const settings = useUpdateVaultSettings();
  const backup = useBackupOps();
  const [profileOpen, setProfileOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  function setDefault(d: Division) {
    settings.mutate({ data: { defaultDivision: d } }, {
      onSuccess: () => { qc.setQueryData(getGetVaultSessionQueryKey(), (o: VaultSession | undefined) => (o ? { ...o, defaultDivision: d } : o)); toast({ title: 'Default division saved', description: DIVISIONS[d].name }); },
      onError: (e) => toast({ title: 'Could not save', description: errMessage(e), variant: 'destructive' }),
    });
  }
  async function doExport() {
    try {
      const env = await backup.exportBackup();
      const blob = new Blob([JSON.stringify(env)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nextaura-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast({ title: 'Encrypted backup downloaded', description: 'The file is ciphertext. Store it somewhere safe.' });
    } catch (e) { toast({ title: 'Export blocked', description: errMessage(e), variant: 'destructive' }); }
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      if (f.size > 10_000_000) throw new Error('Backup exceeds the 10 MB file limit.');
      const env = JSON.parse(await f.text()) as BackupEnvelope;
      if (env?.format !== 'nextaura-vault-v1' || typeof env.ciphertext !== 'string' || !env.ciphertext) throw new Error('This is not a NextAura Vault backup file.');
      const r = await backup.restore({ format: env.format, ciphertext: env.ciphertext });
      toast({ title: 'Backup restored', description: `${r.restored} restored, ${r.skipped} skipped.` });
    } catch (x) { toast({ title: 'Import failed', description: errMessage(x), variant: 'destructive' }); }
  }

  return (
    <div>
      <PageHeader eyebrow="Control" title="Settings">Your identity, security posture and the way the vault opens.</PageHeader>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section icon={<UserRound className="h-4 w-4" />} title="Profile" tid="section-profile">
          <Row l="Name"><span data-testid="text-profile-name">{session.name}</span></Row>
          <Row l="Founder identity"><span>{session.founder}</span></Row>
          <Row l="Sign-in email"><span className="break-all">{user?.email ?? '-'}</span></Row>
          <Row l="Division access"><span className="flex gap-1.5">{session.allowedDivisions.map((d) => <DivisionLogo key={d} division={d} size={24} crop={1.7} />)}</span></Row>
          <Button variant="outline" className="mt-4" onClick={() => setProfileOpen(true)} data-testid="button-manage-profile">Manage account</Button>
        </Section>

        <Section icon={<ShieldCheck className="h-4 w-4" />} title="Security" tid="section-security">
          <Row l="Authenticator (MFA)"><span className={session.mfaEnabled ? 'brand-text' : 'text-destructive'} data-testid="status-mfa">{session.mfaEnabled ? 'Enrolled' : 'Not enrolled'}</span></Row>
          <Row l="Server encryption"><span data-testid="status-encryption">{session.encryptionReady ? 'Active' : 'Unavailable'}</span></Row>
          <Row l="Idle lock">15 minutes</Row>
          <Row l="Sensitive actions">Second factor within 5 minutes</Row>
          <Row l="Revealed passwords">Hidden after 20 seconds</Row>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setProfileOpen(true)} data-testid="button-manage-security">Manage authenticator</Button>
            <Button variant="outline" className="gap-2" onClick={lock} disabled={locking} data-testid="button-lock-settings"><Lock className="h-4 w-4" />Lock vault now</Button>
          </div>
        </Section>

        <Section icon={<Film className="h-4 w-4" />} title="Experience" tid="section-experience">
          <Row l="Opening sequence"><Button size="sm" variant="outline" onClick={replayIntro} data-testid="button-replay-intro">Replay intro</Button></Row>
          <Row l="Default division">
            <Select value={session.defaultDivision} onValueChange={(v) => setDefault(v as Division)} disabled={settings.isPending}>
              <SelectTrigger className="w-[210px]" data-testid="select-default-division"><SelectValue /></SelectTrigger>
              <SelectContent>{session.allowedDivisions.map((d) => <SelectItem key={d} value={d}>{DIVISIONS[d].name}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <p className="mt-3 text-xs text-muted-foreground">The intro plays on first sign-in and when replayed here. It respects reduced-motion settings.</p>
        </Section>

        <Section icon={<Download className="h-4 w-4" />} title="Encrypted backup" tid="section-backup">
          <p className="mb-4 text-sm text-muted-foreground">Export produces an encrypted file only the server key can open. Import restores credentials from such a file. Both require a fresh second factor.</p>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Keep an offline recovery copy of the server encryption key and a backup authenticator on separate secure devices. Losing the key makes credentials and backups unreadable. Changing the key is not a supported recovery method. Import merges records and skips existing IDs.</p>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={() => void doExport()} disabled={backup.exporting} data-testid="button-export-backup">{backup.exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export backup</Button>
            <Button variant="outline" className="gap-2" onClick={() => file.current?.click()} disabled={backup.restoring} data-testid="button-import-backup">{backup.restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Import backup</Button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e)} data-testid="input-import-file" />
          </div>
        </Section>

        <div className="xl:col-span-2">
          <Section icon={<UserRound className="h-4 w-4" />} title="Founder access" tid="section-access"><FounderAccessPanel /></Section>
        </div>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="glass max-h-[92dvh] max-w-lg overflow-auto rounded-3xl p-7">
          <DialogTitle className="font-display text-3xl">Account security</DialogTitle>
          <DialogDescription>Manage verified authenticators for {user?.email ?? 'this founder account'}.</DialogDescription>
          <AuthenticatorManager />
        </DialogContent>
      </Dialog>
    </div>
  );
}

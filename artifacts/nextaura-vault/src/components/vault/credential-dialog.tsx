import { useEffect, useState } from 'react';
import { Dices, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useGetPlatforms, type Credential, type Division } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCredentialWrites } from '@/hooks/use-vault-ops';
import { DIVISIONS, DIVISION_ORDER, errMessage, resolvePlatform } from '@/lib/brand';
import { PlatformLogo } from './logos';
import { useVault } from './context';

export interface DialogState { open: boolean; edit?: Credential; preset?: { division?: Division; platform?: string } }

function generate(len = 24) {
  const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => set[n % set.length]).join('');
}

export function CredentialDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const { session, division: current } = useVault();
  const { data: platforms } = useGetPlatforms();
  const { toast } = useToast();
  const writes = useCredentialWrites();
  const [division, setDivision] = useState<Division>(current);
  const [platform, setPlatform] = useState('');
  const [accountName, setAccountName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const edit = state.edit;

  useEffect(() => {
    if (!state.open) { setPassword(''); setShow(false); setErr(''); return; }
    setDivision(edit?.division ?? state.preset?.division ?? current);
    const p = edit?.platform ?? state.preset?.platform ?? '';
    setPlatform(resolvePlatform(p, platforms)?.id ?? p);
    setAccountName(edit?.accountName ?? '');
    setUsername(edit?.username ?? '');
    setPassword('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, edit?.id]);

  const selected = resolvePlatform(platform, platforms);
  const divisions = DIVISION_ORDER.filter((d) => session.allowedDivisions.includes(d));
  const valid = platform && accountName.trim() && username.trim() && (edit || password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setErr('');
    try {
      if (edit) {
        await writes.update(edit.id, { division, platform, accountName: accountName.trim(), username: username.trim(), ...(password ? { password } : {}) });
        toast({ title: 'Credential updated', description: `${accountName.trim()} saved to ${DIVISIONS[division].short}.` });
      } else {
        await writes.create({ division, platform, accountName: accountName.trim(), username: username.trim(), password });
        toast({ title: 'Credential stored', description: `${accountName.trim()} added to ${DIVISIONS[division].short}.` });
      }
      setPassword('');
      onClose();
    } catch (x) {
      setErr(errMessage(x));
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !writes.pending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-[hsl(var(--brand)/.25)] bg-popover/95 backdrop-blur-xl sm:max-w-lg" data-testid="dialog-credential">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{edit ? 'Edit credential' : 'Add credential'}</DialogTitle>
          <DialogDescription>Secrets are encrypted on the server. Writes need a second factor verified within the last 5 minutes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as Division)}>
                <SelectTrigger data-testid="select-division"><SelectValue /></SelectTrigger>
                <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{DIVISIONS[d].name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="select-platform">
                  <SelectValue placeholder="Choose platform">
                    {selected && <span className="flex items-center gap-2"><PlatformLogo id={selected.id} name={selected.name} platform={selected} size={20} className="rounded-md" />{selected.name}</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(platforms ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><PlatformLogo id={p.id} name={p.name} platform={p} size={20} className="rounded-md" />{p.name}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cred-account">Account name</Label>
            <Input id="cred-account" value={accountName} maxLength={120} onChange={(e) => setAccountName(e.target.value)} placeholder="Production workspace" data-testid="input-account-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cred-user">Email or username</Label>
            <Input id="cred-user" value={username} maxLength={320} onChange={(e) => setUsername(e.target.value)} autoComplete="off" data-testid="input-username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cred-pass">Password {edit && <span className="text-muted-foreground">(leave blank to keep current)</span>}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input id="cred-pass" type={show ? 'text' : 'password'} value={password} maxLength={4096} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="pr-10 font-mono" data-testid="input-password" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <Button type="button" variant="outline" size="icon" aria-label="Generate password" title="Generate strong password" onClick={() => { setPassword(generate()); setShow(true); }} data-testid="button-generate-password"><Dices className="h-4 w-4" /></Button>
            </div>
          </div>
          {err && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground/90" data-testid="text-form-error">{err}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={writes.pending} data-testid="button-cancel-credential">Cancel</Button>
            <Button type="submit" disabled={!valid || writes.pending} data-testid="button-save-credential">
              {writes.pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{edit ? 'Save changes' : 'Store credential'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

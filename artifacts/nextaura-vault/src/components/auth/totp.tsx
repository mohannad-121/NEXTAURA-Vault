import { useEffect, useState } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { Check, Copy, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errMessage } from '@/lib/brand';
import { supabase } from '@/lib/supabase';

function TotpCodeInput({ code, setCode }: { code: string; setCode: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="totp-code">Authenticator code</Label>
      <Input
        id="totp-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        placeholder="6-digit code"
        className="h-12 text-center font-mono text-lg tracking-[0.4em]"
        data-testid="input-totp"
      />
    </div>
  );
}

export function TotpChallenge({ onComplete }: { onComplete: () => void | Promise<void> }) {
  const [code, setCode] = useState('');
  const [factors, setFactors] = useState<Factor<'totp', 'verified'>[]>([]);
  const [factorId, setFactorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void supabase.auth.mfa.listFactors().then((result) => {
      if (!alive) return;
      if (result.error) {
        setError(errMessage(result.error));
        return;
      }
      setFactors(result.data.totp);
      setFactorId(result.data.totp[0]?.id ?? '');
    });
    return () => { alive = false; };
  }, []);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!factorId) throw new Error('No verified authenticator is available for this account.');
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setCode('');
      await onComplete();
    } catch (cause) {
      setError(errMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={verify} className="mt-6 space-y-3">
      {factors.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor="totp-factor">Authenticator</Label>
          <select
            id="totp-factor"
            value={factorId}
            onChange={(event) => setFactorId(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {factors.map((factor, index) => (
              <option key={factor.id} value={factor.id}>{factor.friendly_name || `Authenticator ${index + 1}`}</option>
            ))}
          </select>
        </div>
      ) : null}
      <TotpCodeInput code={code} setCode={setCode} />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11 w-full" disabled={!factorId || code.length < 6 || busy} data-testid="button-verify-totp">
        {busy ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
        Verify and continue
      </Button>
    </form>
  );
}

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function TotpEnrollment({ onComplete }: { onComplete: () => void | Promise<void> }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function begin() {
    setBusy(true);
    setError('');
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      await Promise.all(
        factors.data.all
          .filter((factor) => factor.factor_type === 'totp' && factor.status === 'unverified')
          .map(async (factor) => {
            const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
            if (result.error) throw result.error;
          }),
      );
      const result = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `NEXTAURA Vault ${new Date().toISOString().slice(0, 10)}`,
        issuer: 'NEXTAURA Vault',
      });
      if (result.error) throw result.error;
      const qrCode = result.data.totp.qr_code.startsWith('data:')
        ? result.data.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(result.data.totp.qr_code)}`;
      setEnrollment({ factorId: result.data.id, qrCode, secret: result.data.totp.secret });
    } catch (cause) {
      setError(errMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError('');
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
      if (result.error) throw result.error;
      setCode('');
      setEnrollment(null);
      await onComplete();
    } catch (cause) {
      setError(errMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!enrollment) {
    return (
      <div className="mt-6">
        {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" onClick={() => void begin()} disabled={busy} data-testid="button-enroll-totp">
          {busy ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="mr-2 h-4 w-4" />}
          Begin authenticator setup
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="mt-6 space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4">
        <img src={enrollment.qrCode} alt="QR code for NEXTAURA Vault authenticator enrollment" className="mx-auto h-48 w-48" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="totp-secret">Manual setup key</Label>
        <div className="flex items-center gap-2">
          <Input id="totp-secret" readOnly value={enrollment.secret} className="font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy authenticator setup key"
            onClick={() => void navigator.clipboard.writeText(enrollment.secret).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            })}
          >
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <TotpCodeInput code={code} setCode={setCode} />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11 w-full" disabled={code.length < 6 || busy}>
        {busy ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
        Confirm authenticator
      </Button>
    </form>
  );
}

export function AuthenticatorManager() {
  const [factors, setFactors] = useState<Factor<'totp', 'verified'>[]>([]);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const result = await supabase.auth.mfa.listFactors();
    if (result.error) throw result.error;
    setFactors(result.data.totp);
  }

  useEffect(() => {
    void load().catch((cause) => setError(errMessage(cause)));
  }, []);

  async function remove(factorId: string) {
    if (factors.length <= 1) return;
    setBusyId(factorId);
    setError('');
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId });
      if (result.error) throw result.error;
      await load();
    } catch (cause) {
      setError(errMessage(cause));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-4">
      {factors.map((factor, index) => (
        <div key={factor.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3">
          <div>
            <p className="text-sm font-medium">{factor.friendly_name || `Authenticator ${index + 1}`}</p>
            <p className="text-xs text-muted-foreground">Verified TOTP factor</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove authenticator"
            disabled={factors.length <= 1 || busyId === factor.id}
            onClick={() => void remove(factor.id)}
          >
            {busyId === factor.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
          </Button>
        </div>
      ))}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {adding ? (
        <TotpEnrollment onComplete={async () => { setAdding(false); await load(); }} />
      ) : (
        <Button type="button" variant="outline" className="gap-2" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />Add backup authenticator
        </Button>
      )}
      <p className="text-xs text-muted-foreground">At least one verified authenticator is required, so the last factor cannot be removed here.</p>
    </div>
  );
}

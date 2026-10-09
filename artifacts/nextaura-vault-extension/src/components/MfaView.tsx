import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type FactorOption = { id: string; name: string };

export function MfaView({ purpose, onVerified, onCancel }: {
  purpose: 'unlock' | 'password';
  onVerified: () => Promise<void>;
  onCancel: () => void;
}) {
  const [factors, setFactors] = useState<FactorOption[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void supabase.auth.mfa.listFactors().then((result) => {
      if (!alive) return;
      if (result.error) {
        setError('Your authenticators could not be loaded. Try again.');
        return;
      }
      const options = result.data.totp.map((factor, index) => ({
        id: factor.id,
        name: factor.friendly_name || `Authenticator ${index + 1}`,
      }));
      setFactors(options);
      setFactorId(options[0]?.id ?? '');
      if (!options.length) setError('No verified authenticator is enrolled. Open the full vault to complete setup.');
    });
    return () => { alive = false; };
  }, []);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError('');
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setCode('');
      await onVerified();
    } catch {
      setError('That code could not be verified. Use the current code and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-view">
      <button className="back-button" type="button" onClick={onCancel}><ArrowLeft size={16} aria-hidden="true" />Back</button>
      <section className="glass-panel mfa-panel" aria-labelledby="mfa-title">
        <div className="shield-orbit" aria-hidden="true"><ShieldCheck size={29} /></div>
        <p className="eyebrow">Second factor required</p>
        <h2 id="mfa-title">{purpose === 'password' ? 'Reverify to copy' : 'Verify your identity'}</h2>
        <p className="section-copy">Enter the current code from your authenticator. Codes are sent only to Supabase Auth.</p>
        <form onSubmit={verify} className="auth-form">
          {factors.length > 1 ? (
            <label>
              <span>Authenticator</span>
              <select value={factorId} onChange={(event) => setFactorId(event.target.value)}>
                {factors.map((factor) => <option value={factor.id} key={factor.id}>{factor.name}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span>Authenticator code</span>
            <input className="totp-input" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={8} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000 000" autoFocus />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={busy || !factorId || code.length < 6}>
            {busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
      </section>
    </main>
  );
}

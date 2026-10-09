import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function LoginView({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      await onSignedIn();
    } catch {
      setError('Sign-in failed. Check your founder credentials and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-view">
      <header className="brand-lockup">
        <div className="logo-halo"><img src="/brands/nextaura-vault.png" alt="" /></div>
        <div>
          <p className="eyebrow">Private founder access</p>
          <h1>NEXTAURA <span>VAULT</span></h1>
        </div>
      </header>

      <section className="glass-panel auth-panel" aria-labelledby="login-title">
        <div className="section-icon" aria-hidden="true"><LockKeyhole size={18} /></div>
        <h2 id="login-title">Enter the command vault</h2>
        <p className="section-copy">Secure access for Mohannad and Moayad.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
          </label>
          <label>
            <span>Password</span>
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="icon-button inset-button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}
            {busy ? 'Securing session…' : 'Continue securely'}
          </button>
        </form>
      </section>

      <p className="security-note">Protected by TOTP MFA and server-side founder authorization.</p>
    </main>
  );
}

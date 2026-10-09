import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Ambient } from '@/components/vault/ambient';
import { VaultLogo, Wordmark } from '@/components/vault/logos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/provider';
import { errMessage } from '@/lib/brand';
import { supabase } from '@/lib/supabase';

export function SignInPage() {
  const { loading, session } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && session) return <Redirect to="/dashboard" />;

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(errMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grain relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <Ambient division="agency" />
      <Link href="/" className="absolute left-5 top-5 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground" data-testid="link-back-home">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />Back
      </Link>
      <p className="mb-5 text-[11px] uppercase tracking-[0.35em] text-[#b9a77f]">Private Access. Complete Control.</p>
      <div className="glass w-[440px] max-w-full rounded-3xl border border-[#d4b068]/25 p-7 shadow-2xl sm:p-9">
        <div className="flex flex-col items-center text-center">
          <VaultLogo size={132} />
          <Wordmark className="mt-1 text-sm" />
          <h1 className="font-display mt-6 text-3xl">Enter the vault</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your provisioned founder account.</p>
        </div>
        <form onSubmit={signIn} className="mt-7 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="founder-email">Email</Label>
            <Input id="founder-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="founder-password">Password</Label>
            <div className="relative">
              <Input id="founder-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="pr-12" data-testid="input-password" />
              <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={busy || !email.trim() || !password} data-testid="button-sign-in">
            {busy ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">A verified authenticator is mandatory. Public account registration is disabled.</p>
    </div>
  );
}

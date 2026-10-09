import { useCallback, useEffect, useRef, useState } from 'react';
import type { Credential, Platform, VaultSession } from '@workspace/api-client-react';
import { AlertTriangle, ExternalLink, LoaderCircle, ShieldX } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { MfaView } from './components/MfaView';
import { VaultView } from './components/VaultView';
import { apiErrorMessage, apiStatus, isMfaChallenge, vaultApi, WEBSITE_URL } from './lib/api';
import { copyRevealedPassword } from './lib/clipboard';
import { supabase } from './lib/supabase';

type View = 'loading' | 'login' | 'mfa' | 'blocked' | 'vault';
type MfaPurpose = { kind: 'unlock' } | { kind: 'password'; credentialId: string };
type Toast = { tone: 'success' | 'warning' | 'error'; message: string };

export function App() {
  const [view, setView] = useState<View>('loading');
  const [session, setSession] = useState<VaultSession | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [mfaPurpose, setMfaPurpose] = useState<MfaPurpose>({ kind: 'unlock' });
  const [blockedMessage, setBlockedMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((next: Toast) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const localSignOut = useCallback(async (message?: string) => {
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setCredentials([]);
    setPlatforms([]);
    setView('login');
    if (message) notify({ tone: 'warning', message });
  }, [notify]);

  const handleFailure = useCallback(async (error: unknown) => {
    if (apiStatus(error) === 401) {
      await localSignOut('Your secure session expired. Sign in again.');
      return;
    }
    notify({ tone: 'error', message: apiErrorMessage(error) });
  }, [localSignOut, notify]);

  const loadVault = useCallback(async () => {
    try {
      const gate = await vaultApi.getSession();
      setSession(gate);
      if (gate.status === 'mfa_verification_required') {
        setMfaPurpose({ kind: 'unlock' });
        setView('mfa');
        return;
      }
      if (gate.status !== 'ready') {
        const messages: Record<string, string> = {
          access_pending: 'This account is not bound to an authorized founder identity.',
          mfa_required: 'A verified authenticator must be enrolled in the full vault before the extension can open.',
          encryption_required: 'Server-side vault encryption is not ready. Contact the vault operator.',
        };
        setBlockedMessage(messages[gate.status] || 'The vault is not ready for this account.');
        setView('blocked');
        return;
      }
      const [credentialRows, platformRows] = await Promise.all([
        vaultApi.listCredentials(),
        vaultApi.getPlatforms(),
      ]);
      setCredentials(credentialRows);
      setPlatforms(platformRows);
      setView('vault');
    } catch (error) {
      await handleFailure(error);
      if (apiStatus(error) !== 401) setView('blocked');
    }
  }, [handleFailure]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.session) {
        setView('login');
        return;
      }
      await loadVault();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === 'SIGNED_OUT') setView('login');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [loadVault]);

  async function refresh() {
    setRefreshing(true);
    try {
      const rows = await vaultApi.listCredentials();
      setCredentials(rows);
      notify({ tone: 'success', message: 'Vault metadata refreshed.' });
    } catch (error) {
      await handleFailure(error);
    } finally {
      setRefreshing(false);
    }
  }

  async function copyUsername(credential: Credential): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(credential.username);
      notify({ tone: 'warning', message: 'Username copied. Clipboard contents remain sensitive until replaced.' });
      return true;
    } catch {
      notify({ tone: 'error', message: 'Clipboard access was denied.' });
      return false;
    }
  }

  async function copyPassword(credentialId: string): Promise<boolean> {
    try {
      await copyRevealedPassword(
        credentialId,
        vaultApi.revealCredential,
        (value) => navigator.clipboard.writeText(value),
      );
      notify({ tone: 'warning', message: 'Password copied. It was not stored by the extension; replace your clipboard after use.' });
      return true;
    } catch (error) {
      if (isMfaChallenge(error)) {
        setMfaPurpose({ kind: 'password', credentialId });
        setView('mfa');
        return false;
      }
      await handleFailure(error);
      return false;
    }
  }

  async function verified() {
    if (mfaPurpose.kind === 'password') {
      const id = mfaPurpose.credentialId;
      setView('vault');
      await copyPassword(id);
      return;
    }
    await loadVault();
  }

  async function logout() {
    try { await vaultApi.lock(); } catch { /* The local token is still cleared below. */ }
    const result = await supabase.auth.signOut({ scope: 'global' });
    if (result.error) await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setCredentials([]);
    setPlatforms([]);
    setView('login');
  }

  function openWebsite() {
    if (typeof chrome !== 'undefined' && chrome.tabs) void chrome.tabs.create({ url: WEBSITE_URL });
    else window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
  }

  function cancelMfa() {
    if (mfaPurpose.kind === 'password' && session?.status === 'ready') setView('vault');
    else void localSignOut();
  }

  return (
    <div className="extension-shell">
      <div className="ambient ambient-gold" aria-hidden="true" />
      <div className="ambient ambient-purple" aria-hidden="true" />
      {view === 'loading' ? (
        <main className="loading-view"><img src="/brands/nextaura-vault.png" alt="NEXTAURA Vault" /><LoaderCircle className="spin" size={20} aria-hidden="true" /><p>Securing session</p></main>
      ) : null}
      {view === 'login' ? <LoginView onSignedIn={loadVault} /> : null}
      {view === 'mfa' ? <MfaView purpose={mfaPurpose.kind === 'password' ? 'password' : 'unlock'} onVerified={verified} onCancel={cancelMfa} /> : null}
      {view === 'blocked' ? (
        <main className="auth-view">
          <section className="glass-panel blocked-panel">
            <div className="blocked-icon"><ShieldX size={28} aria-hidden="true" /></div>
            <p className="eyebrow">Access protected</p>
            <h1>Vault unavailable</h1>
            <p>{blockedMessage || 'The vault request could not be completed.'}</p>
            <button className="primary-button" type="button" onClick={openWebsite}>Open full vault <ExternalLink size={16} aria-hidden="true" /></button>
            <button className="text-button" type="button" onClick={() => void logout()}>Sign out</button>
          </section>
        </main>
      ) : null}
      {view === 'vault' && session ? (
        <VaultView
          session={session}
          credentials={credentials}
          platforms={platforms}
          refreshing={refreshing}
          onRefresh={refresh}
          onCopyUsername={copyUsername}
          onCopyPassword={(credential) => copyPassword(credential.id)}
          onOpenWebsite={openWebsite}
          onLogout={logout}
        />
      ) : null}
      {toast ? <div className={`toast ${toast.tone}`} role="status"><AlertTriangle size={16} aria-hidden="true" /><span>{toast.message}</span></div> : null}
    </div>
  );
}

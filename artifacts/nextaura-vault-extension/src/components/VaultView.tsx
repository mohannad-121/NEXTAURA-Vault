import { useMemo, useState } from 'react';
import type { Credential, Division, Platform, VaultSession } from '@workspace/api-client-react';
import { Check, Copy, ExternalLink, KeyRound, LoaderCircle, LogOut, RefreshCw, Search, UserRound } from 'lucide-react';
import { filterCredentials, type DivisionFilter } from '../lib/filter';

const divisions: Array<{ id: DivisionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'agency', label: 'Agency' },
  { id: 'ai', label: 'AI' },
  { id: 'studios', label: 'Studios' },
  { id: 'os', label: 'OS' },
];

function platformIcon(credential: Credential, platforms: Platform[]): string {
  return platforms.find((platform) => platform.id === credential.platform)?.icon || `/platforms/${credential.platform}.svg`;
}

function CredentialCard({ credential, platforms, copied, onCopyUsername, onCopyPassword }: {
  credential: Credential;
  platforms: Platform[];
  copied: string | null;
  onCopyUsername: (credential: Credential) => void;
  onCopyPassword: (credential: Credential) => void;
}) {
  const platform = platforms.find((item) => item.id === credential.platform);
  return (
    <article className="credential-card">
      <div className="platform-mark"><img src={platformIcon(credential, platforms)} alt="" /></div>
      <div className="credential-main">
        <div className="credential-heading">
          <div>
            <h3>{credential.accountName}</h3>
            <p>{platform?.name || credential.platform}</p>
          </div>
          <span className={`division-badge ${credential.division}`}>{credential.division}</span>
        </div>
        <button className="username-row" type="button" onClick={() => onCopyUsername(credential)} aria-label={`Copy username for ${credential.accountName}`}>
          <UserRound size={14} aria-hidden="true" />
          <span>{credential.username}</span>
          {copied === `user:${credential.id}` ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </button>
        <button className="secret-button" type="button" onClick={() => onCopyPassword(credential)}>
          {copied === `password:${credential.id}` ? <Check size={15} aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
          {copied === `password:${credential.id}` ? 'Password copied' : 'Copy password'}
        </button>
      </div>
    </article>
  );
}

export function VaultView({ session, credentials, platforms, refreshing, onRefresh, onCopyUsername, onCopyPassword, onOpenWebsite, onLogout }: {
  session: VaultSession;
  credentials: Credential[];
  platforms: Platform[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onCopyUsername: (credential: Credential) => Promise<boolean>;
  onCopyPassword: (credential: Credential) => Promise<boolean>;
  onOpenWebsite: () => void;
  onLogout: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<DivisionFilter>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const visible = useMemo(() => filterCredentials(credentials, search, division), [credentials, division, search]);
  const allowed = new Set(session.allowedDivisions);

  async function copiedAction(key: string, action: () => Promise<boolean>) {
    const succeeded = await action();
    if (!succeeded) return;
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800);
  }

  return (
    <main className="vault-view">
      <header className="vault-header">
        <div className="mini-brand">
          <img src="/brands/nextaura-vault.png" alt="" />
          <div><p>NEXTAURA</p><strong>VAULT</strong></div>
        </div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => void onRefresh()} aria-label="Refresh credentials" disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={() => void onLogout()} aria-label="Lock and sign out"><LogOut size={17} aria-hidden="true" /></button>
        </div>
      </header>

      <section className="welcome-row">
        <div><p className="eyebrow">Secure session</p><h1>Welcome, {session.name.split(' ')[0]}</h1></div>
        <span className="secure-pill"><span />AAL2</span>
      </section>

      <label className="search-box">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search credentials</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search platform, account or username" />
      </label>

      <nav className="filter-strip" aria-label="Credential divisions">
        {divisions.map((item) => {
          const disabled = item.id !== 'all' && !allowed.has(item.id);
          return <button key={item.id} type="button" disabled={disabled} aria-pressed={division === item.id} onClick={() => setDivision(item.id)}>{item.label}</button>;
        })}
      </nav>

      <div className="list-heading"><span>{visible.length} {visible.length === 1 ? 'account' : 'accounts'}</span><span>Encrypted at rest</span></div>
      <section className="credential-list" aria-live="polite">
        {visible.length ? visible.map((credential) => (
          <CredentialCard
            key={credential.id}
            credential={credential}
            platforms={platforms}
            copied={copied}
            onCopyUsername={(item) => void copiedAction(`user:${item.id}`, () => onCopyUsername(item))}
            onCopyPassword={(item) => void copiedAction(`password:${item.id}`, () => onCopyPassword(item))}
          />
        )) : (
          <div className="empty-state"><Search size={22} aria-hidden="true" /><h2>No matching accounts</h2><p>Try another search or division.</p></div>
        )}
      </section>

      <footer className="vault-footer">
        <button type="button" onClick={onOpenWebsite}>Open full vault <ExternalLink size={14} aria-hidden="true" /></button>
        <span>Secrets stay server-protected</span>
      </footer>
    </main>
  );
}

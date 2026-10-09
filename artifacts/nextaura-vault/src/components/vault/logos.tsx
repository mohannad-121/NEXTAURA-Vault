import { useState } from 'react';
import type { Division, Platform } from '@workspace/api-client-react';
import { asset, DIVISIONS, platformIconUrl } from '@/lib/brand';
import { cn } from '@/lib/utils';

/** Original asset, unmodified. Cropped visually via scale; screen-blend dissolves the black matte on dark surfaces. */
export function DivisionLogo({ division, size = 64, crop = 1.65, className }: { division: Division; size?: number; crop?: number; className?: string }) {
  const d = DIVISIONS[division];
  return (
    <span className={cn('relative inline-block shrink-0 overflow-hidden', className)} style={{ width: size, height: size }}>
      <img src={d.logo} alt={d.name} draggable={false} className="absolute inset-0 h-full w-full select-none object-contain mix-blend-screen" style={{ transform: `scale(${crop})` }} />
    </span>
  );
}

export function VaultLogo({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <img
      src={asset('brands/nextaura-vault.png')}
      alt="NextAura Vault"
      draggable={false}
      className={cn('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function PlatformLogo({ id, name, platform, size = 44, className }: { id: string; name: string; platform?: Platform; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl bg-[#efe9df] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]', className)} style={{ width: size, height: size }}>
      {failed ? (
        <span className="text-sm font-semibold text-[#2b2620]">{name.slice(0, 2).toUpperCase()}</span>
      ) : (
        <img src={platformIconUrl(id, platform)} alt={name} draggable={false} onError={() => setFailed(true)} style={{ width: size * 0.58, height: size * 0.58 }} className="object-contain" />
      )}
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-[1.05rem] uppercase tracking-[0.34em]', className)}>
      NextAura <span className="brand-text">Vault</span>
    </span>
  );
}

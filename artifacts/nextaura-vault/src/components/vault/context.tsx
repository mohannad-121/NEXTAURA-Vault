import { createContext, useContext } from 'react';
import type { Credential, Division, VaultSession } from '@workspace/api-client-react';

export interface VaultCtx {
  session: VaultSession;
  division: Division;
  openCreate: (preset?: { division?: Division; platform?: string }) => void;
  openEdit: (c: Credential) => void;
  openPalette: () => void;
  replayIntro: () => void;
  lock: () => void;
  locking: boolean;
}
export const VaultContext = createContext<VaultCtx | null>(null);
export function useVault(): VaultCtx {
  const v = useContext(VaultContext);
  if (!v) throw new Error('useVault outside shell');
  return v;
}

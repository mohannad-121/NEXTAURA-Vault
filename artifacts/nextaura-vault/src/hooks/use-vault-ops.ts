import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReverification } from '@clerk/react';
import { revealCredential, createCredential, updateCredential } from '@workspace/api-client-react';
import {
  getGetVaultActivityQueryKey, getGetVaultSummaryQueryKey, getListCredentialsQueryKey,
  useDeleteCredential,
  useExportVaultBackup, useRestoreVaultBackup, useUpdateFounderAccess, getGetFounderAccessQueryKey,
  type AccessInput, type BackupEnvelope, type CredentialInput, type CredentialUpdate,
} from '@workspace/api-client-react';

/** Backend answers stale second factors with a 403 carrying a Clerk reverification hint in .data.
 *  Return that payload (instead of throwing) so useReverification opens its modal and retries. */
function hintable<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  return async (...a: A): Promise<R> => {
    try { return await fn(...a); } catch (e) {
      const x = e as { status?: number; data?: { clerk_error?: unknown } | null };
      if (x?.status === 403 && x.data && typeof x.data === 'object' && 'clerk_error' in x.data) return x.data as unknown as R;
      throw e;
    }
  };
}

export function useRefreshVault() {
  const qc = useQueryClient();
  return useCallback(
    () => Promise.all([
      qc.invalidateQueries({ queryKey: getListCredentialsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetVaultSummaryQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetVaultActivityQueryKey() }),
    ]),
    [qc],
  );
}

/** Sensitive create/update. Passwords live only in request memory. */
export function useCredentialWrites() {
  const refresh = useRefreshVault();
  const [pending, setPending] = useState(false);
  // Direct API calls avoid retaining plaintext password request variables in
  // React Query's mutation cache after the form has closed.
  const doCreate = useReverification(hintable(async (data: CredentialInput) => {
    setPending(true);
    try { const r = await createCredential(data); await refresh(); return r; }
    finally { setPending(false); }
  }));
  const doUpdate = useReverification(hintable(async (id: string, data: CredentialUpdate) => {
    setPending(true);
    try { const r = await updateCredential(id, data); await refresh(); return r; }
    finally { setPending(false); }
  }));
  return { create: doCreate, update: doUpdate, pending };
}

export function useCredentialDelete() {
  const refresh = useRefreshVault();
  const del = useDeleteCredential();
  const run = useReverification(hintable(async (id: string) => { await del.mutateAsync({ id }); await refresh(); }));
  return { run, pending: del.isPending };
}

/** Direct fetch, no mutation cache: the secret never enters React Query state. */
export function useRevealSecret() {
  const [pending, setPending] = useState(false);
  const run = useReverification(hintable(async (id: string) => { const r = await revealCredential(id); return r.password; }));
  const wrapped = async (id: string) => { setPending(true); try { return await run(id); } finally { setPending(false); } };
  return { run: wrapped, pending };
}

export function useBackupOps() {
  const refresh = useRefreshVault();
  const exp = useExportVaultBackup();
  const res = useRestoreVaultBackup();
  const doExport = useReverification(hintable(async () => { const r = await exp.mutateAsync(); void refresh(); return r; }));
  const doRestore = useReverification(hintable(async (data: BackupEnvelope) => { const r = await res.mutateAsync({ data }); await refresh(); return r; }));
  return { exportBackup: doExport, restore: doRestore, exporting: exp.isPending, restoring: res.isPending };
}

export function useAccessWrite() {
  const qc = useQueryClient();
  const m = useUpdateFounderAccess();
  const run = useReverification(hintable(async (id: string, data: AccessInput) => {
    const r = await m.mutateAsync({ id, data });
    await qc.invalidateQueries({ queryKey: getGetFounderAccessQueryKey() });
    return r;
  }));
  return { run, pending: m.isPending };
}

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { revealCredential, createCredential, updateCredential } from '@workspace/api-client-react';
import { useMfaReverification } from '@/components/auth/mfa-reverification';
import {
  getGetVaultActivityQueryKey, getGetVaultSummaryQueryKey, getListCredentialsQueryKey,
  useDeleteCredential,
  useExportVaultBackup, useRestoreVaultBackup, useUpdateFounderAccess, getGetFounderAccessQueryKey,
  type AccessInput, type BackupEnvelope, type CredentialInput, type CredentialUpdate,
} from '@workspace/api-client-react';

function isMfaRequired(error: unknown): boolean {
  const candidate = error as { status?: number; data?: { status?: unknown } | null };
  return candidate?.status === 403 && candidate.data?.status === 'mfa_verification_required';
}

async function withFreshMfa<T>(requestVerification: () => Promise<void>, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isMfaRequired(error)) throw error;
    await requestVerification();
    return action();
  }
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
  const requestVerification = useMfaReverification();
  const [pending, setPending] = useState(false);
  // Direct API calls avoid retaining plaintext password request variables in
  // React Query's mutation cache after the form has closed.
  const doCreate = async (data: CredentialInput) => withFreshMfa(requestVerification, async () => {
    setPending(true);
    try { const r = await createCredential(data); await refresh(); return r; }
    finally { setPending(false); }
  });
  const doUpdate = async (id: string, data: CredentialUpdate) => withFreshMfa(requestVerification, async () => {
    setPending(true);
    try { const r = await updateCredential(id, data); await refresh(); return r; }
    finally { setPending(false); }
  });
  return { create: doCreate, update: doUpdate, pending };
}

export function useCredentialDelete() {
  const refresh = useRefreshVault();
  const requestVerification = useMfaReverification();
  const del = useDeleteCredential();
  const run = (id: string) => withFreshMfa(requestVerification, async () => { await del.mutateAsync({ id }); await refresh(); });
  return { run, pending: del.isPending };
}

/** Direct fetch, no mutation cache: the secret never enters React Query state. */
export function useRevealSecret() {
  const [pending, setPending] = useState(false);
  const requestVerification = useMfaReverification();
  const run = (id: string) => withFreshMfa(requestVerification, async () => { const r = await revealCredential(id); return r.password; });
  const wrapped = async (id: string) => { setPending(true); try { return await run(id); } finally { setPending(false); } };
  return { run: wrapped, pending };
}

export function useBackupOps() {
  const refresh = useRefreshVault();
  const requestVerification = useMfaReverification();
  const exp = useExportVaultBackup();
  const res = useRestoreVaultBackup();
  const doExport = () => withFreshMfa(requestVerification, async () => { const r = await exp.mutateAsync(); void refresh(); return r; });
  const doRestore = (data: BackupEnvelope) => withFreshMfa(requestVerification, async () => { const r = await res.mutateAsync({ data }); await refresh(); return r; });
  return { exportBackup: doExport, restore: doRestore, exporting: exp.isPending, restoring: res.isPending };
}

export function useAccessWrite() {
  const qc = useQueryClient();
  const requestVerification = useMfaReverification();
  const m = useUpdateFounderAccess();
  const run = (id: string, data: AccessInput) => withFreshMfa(requestVerification, async () => {
    const r = await m.mutateAsync({ id, data });
    await qc.invalidateQueries({ queryKey: getGetFounderAccessQueryKey() });
    return r;
  });
  return { run, pending: m.isPending };
}

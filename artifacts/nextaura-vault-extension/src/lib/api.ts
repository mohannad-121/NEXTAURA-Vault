import {
  getPlatforms,
  getVaultSession,
  listCredentials,
  lockVault,
  revealCredential,
  setAuthTokenGetter,
  setBaseUrl,
} from '@workspace/api-client-react';
import { supabase } from './supabase';

export const WEBSITE_URL = 'https://nextaura-vault.vercel.app';
export const API_ORIGIN = WEBSITE_URL;

setBaseUrl(API_ORIGIN);
setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

export const vaultApi = {
  getSession: getVaultSession,
  listCredentials,
  getPlatforms,
  revealCredential,
  lock: lockVault,
};

export function apiStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
}

export function apiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const data = 'data' in error ? (error as { data?: unknown }).data : undefined;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string') return message;
    }
    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return 'The secure request could not be completed.';
}

export function isMfaChallenge(error: unknown): boolean {
  if (apiStatus(error) !== 403 || typeof error !== 'object' || error === null || !('data' in error)) return false;
  const data = (error as { data?: unknown }).data;
  return typeof data === 'object' && data !== null && (data as { status?: unknown }).status === 'mfa_verification_required';
}

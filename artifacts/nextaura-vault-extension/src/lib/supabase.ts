import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'qulqcuuzncyyszgdpfad';
const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (url !== `https://${PROJECT_REF}.supabase.co` || !publishableKey) {
  throw new Error('The NEXTAURA Supabase extension configuration is missing or inconsistent.');
}

const previewStorage = new Map<string, string>();
const extensionStorage = typeof chrome !== 'undefined' && Boolean(chrome.storage?.session);

// chrome.storage.session is memory-backed and cleared when Chrome exits. Its
// access level is explicitly limited to trusted extension pages/workers.
if (extensionStorage) void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });

const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!extensionStorage) return previewStorage.get(key) ?? null;
    const stored = await chrome.storage.session.get(key);
    return typeof stored[key] === 'string' ? stored[key] : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!extensionStorage) { previewStorage.set(key, value); return; }
    await chrome.storage.session.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    if (!extensionStorage) { previewStorage.delete(key); return; }
    await chrome.storage.session.remove(key);
  },
};

export const supabase = createClient(url, publishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: sessionStorage,
    storageKey: 'nextaura-vault-extension-session',
  },
});

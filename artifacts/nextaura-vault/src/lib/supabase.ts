import { createClient } from '@supabase/supabase-js';

const EXPECTED_PROJECT_REF = 'qulqcuuzncyyszgdpfad';
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (
  projectId !== EXPECTED_PROJECT_REF ||
  supabaseUrl !== `https://${EXPECTED_PROJECT_REF}.supabase.co` ||
  !publishableKey
) {
  throw new Error('Supabase browser configuration is missing or inconsistent.');
}

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

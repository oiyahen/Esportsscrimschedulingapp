import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (import.meta.env.DEV) {
  console.log('[Supabase] URL present:', !!supabaseUrl);
  console.log('[Supabase] anon key present:', !!supabaseAnonKey);
}

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not set or is empty. Check Vercel Env Vars + redeploy.');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set or is empty. Check Vercel Env Vars + redeploy.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

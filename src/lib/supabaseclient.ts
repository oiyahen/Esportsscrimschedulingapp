import { createClient } from "@supabase/supabase-js";

// Read Vite env vars and defensively trim them to avoid leading/trailing space issues
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";

const supabaseUrl = rawUrl.trim();
const supabaseAnonKey = rawAnonKey.trim();

console.log("[Supabase] URL:", supabaseUrl);
console.log("[Supabase] anon key present:", !!supabaseAnonKey);

if (!supabaseUrl) {
	throw new Error("VITE_SUPABASE_URL is not set or is empty. Check your .env file.");
}

if (!supabaseAnonKey) {
	throw new Error("VITE_SUPABASE_ANON_KEY is not set or is empty. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
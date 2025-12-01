import { createClient } from "@supabase/supabase-js";

/**
 * Client for client-side & simple server components
 * (uses anon key)
 */
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Admin client (uses service role key)
 * ONLY for API routes & secure server actions
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/**
 * Compatibility alias — many files in your code use this
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}

/**
 * Optional, legacy helper (some templates use this name)
 */
export function createServerClient() {
  return supabaseAdmin;
}
import { createClient } from "@supabase/supabase-js";

/**
 * ---------------------------------------------------
 * CLIENT — runs in the browser
 * Uses ANON KEY
 * ---------------------------------------------------
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * ---------------------------------------------------
 * SERVER — uses SERVICE ROLE KEY
 * Used by API routes + server components
 * ---------------------------------------------------
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/**
 * ---------------------------------------------------
 * Alias for backwards compatibility
 * Many files still import getSupabaseAdmin()
 * ---------------------------------------------------
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
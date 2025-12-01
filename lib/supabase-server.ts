// lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-SIDE Supabase client
 * Uses SERVICE ROLE KEY — DO NOT expose to browser
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/**
 * Backwards compatibility:
 * Some files still import getSupabaseAdmin()
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
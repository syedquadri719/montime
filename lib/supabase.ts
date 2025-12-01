// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// -------------------------------
// CLIENT-SIDE SUPABASE
// -------------------------------
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// -------------------------------
// SERVER-SIDE (ADMIN) SUPABASE
// -------------------------------
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false }
    }
  );
}
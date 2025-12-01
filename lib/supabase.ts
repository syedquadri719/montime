// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------
// CLIENT (Runs in browser)
// ---------------------------------------------------------
export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ---------------------------------------------------------
// SERVER / ADMIN (Runs on server only)
// ---------------------------------------------------------
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false }
    }
  );
}
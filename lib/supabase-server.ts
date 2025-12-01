// lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * SERVER-SIDE Supabase client (admin)
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
 * SERVER-SIDE Supabase client (with user session from cookies)
 * Use this in Server Components to access user session
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string) => {
            return cookieStore.get(key)?.value ?? null;
          },
          setItem: () => {},
          removeItem: () => {},
        },
      },
    }
  );
}

/**
 * Backwards compatibility:
 * Some files still import getSupabaseAdmin()
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
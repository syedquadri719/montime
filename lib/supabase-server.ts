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

  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  // If we have tokens, set the session manually
  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return client;
}

/**
 * Backwards compatibility:
 * Some files still import getSupabaseAdmin()
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
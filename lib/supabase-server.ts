// lib/supabase-server.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get SERVER-SIDE Supabase client (admin)
 * Uses SERVICE ROLE KEY — DO NOT expose to browser
 * Creates client lazily to ensure env vars are available
 */
export function getSupabaseAdmin() {
  if (_supabaseAdmin) {
    return _supabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20),
      keyPrefix: supabaseServiceKey?.substring(0, 20),
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
    throw new Error('Missing required Supabase environment variables');
  }

  _supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: { persistSession: false },
    }
  );

  return _supabaseAdmin;
}

/**
 * Backwards compatibility - use getSupabaseAdmin() instead
 * @deprecated Use getSupabaseAdmin() function to ensure lazy initialization
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  }
});

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
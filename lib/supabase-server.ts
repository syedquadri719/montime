// lib/supabase-server.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Get SERVER-SIDE Supabase client (admin)
 * Uses SERVICE ROLE KEY — DO NOT expose to browser
 * Creates a fresh client on each call (no caching in serverless)
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('getSupabaseAdmin - Environment check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    urlValue: supabaseUrl,
    keyPrefix: supabaseServiceKey?.substring(0, 30),
    keyLength: supabaseServiceKey?.length
  });

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

  // Create a fresh client each time - no caching in serverless
  const client = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    }
  );

  console.log('Supabase admin client created with URL:', supabaseUrl.substring(0, 30));

  return client;
}

/**
 * SERVER-SIDE Supabase client (with user session from cookies)
 * Use this in Server Components to access user session
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('createServerClient - Has tokens:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or anon key');
  }

  const client = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  // If we have tokens, set the session manually
  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.log('createServerClient - Error setting session:', error.message);
    } else {
      console.log('createServerClient - Session set successfully');
    }
  }

  return client;
}
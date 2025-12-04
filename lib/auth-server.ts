// lib/auth-server.ts
import { NextRequest } from "next/server";
import { getSupabaseAdmin, createServerClient } from "./supabase-server";

/* ---------- CURRENT USER (API routes with Bearer token OR cookies) ---------- */
export async function getCurrentUser(request: NextRequest) {
  // First, try Bearer token authentication (for external agents)
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    console.log('getCurrentUser - Trying Bearer token authentication');
    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      console.log('getCurrentUser - Bearer token auth failed:', error.message);
    }
    if (!error && user) {
      console.log('getCurrentUser - Bearer token auth successful for user:', user.id);
      return user;
    }
  }

  // Fallback to cookie-based authentication (for browser API calls)
  console.log('getCurrentUser - Trying cookie-based authentication');
  const supabaseServer = await createServerClient();
  const { data: { user }, error } = await supabaseServer.auth.getUser();
  if (error) {
    console.log('getCurrentUser - Cookie auth failed:', error.message);
    return null;
  }

  if (user) {
    console.log('getCurrentUser - Cookie auth successful for user:', user.id);
  } else {
    console.log('getCurrentUser - No user found in cookies');
  }

  return user;
}

/* ---------- CURRENT USER (Server Components with cookies) ---------- */
export async function getCurrentUserServer() {
  const supabaseServer = await createServerClient();

  const { data: { user }, error } = await supabaseServer.auth.getUser();
  if (error) return null;

  return user;
}

/* ---------- USER PROFILE (Server) ---------- */
export async function getUserProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

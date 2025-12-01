// lib/auth-server.ts
import { NextRequest } from "next/server";
import { supabaseAdmin, createServerClient } from "./supabase-server";

/* ---------- CURRENT USER (API routes with Bearer token) ---------- */
export async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

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
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

import { NextRequest } from "next/server";
import { supabase, supabaseServer } from "./supabase";

// -------- SIGN UP --------
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) throw error;
  return data;
}

// -------- SIGN IN --------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// -------- SIGN OUT --------
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// -------- CURRENT USER --------
export async function getCurrentUser(request?: NextRequest) {
  // Server request: use service client
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error) return null;

    return data.user;
  }

  // Client request
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return data.user;
}

// -------- SESSION --------
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// -------- USER PROFILE --------
export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
import { NextRequest } from "next/server";
import { supabase } from "./supabase";         // browser client
import { supabaseAdmin } from "./supabase";    // backend service client

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

// -------- LOGIN --------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// -------- LOGOUT --------
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// -------- GET CURRENT USER --------
export async function getCurrentUser(request?: NextRequest) {
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;

    return data.user;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

// -------- SESSION --------
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
}

// -------- USER PROFILE --------
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
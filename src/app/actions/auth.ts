"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=/teacher` },
  });
  return { ok: !error, error: error?.message };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}

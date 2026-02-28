// Server-side Supabase client with service role for authoritative updates.
// Use only in Server Actions / API routes. Requires SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }
  return createClient(url, key);
}

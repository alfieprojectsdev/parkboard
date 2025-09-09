// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    // NEW v0.7+ cookie API
    cookieOptions: {
      get: (name: string) => nextCookies().get(name)?.value ?? null,
      set: (name: string, value: string) => nextCookies().set(name, value),
      remove: (name: string) => nextCookies().delete(name),
    },
  });
}

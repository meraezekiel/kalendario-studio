import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Literal property access so Next inlines them into the client bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when Supabase is configured; when false every cloud entry point stays hidden. */
export function cloudEnabled(): boolean {
  return !!url && !!anonKey;
}

/** The shared Supabase client, created on first use. Throws when cloud is not configured. */
export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    client = createClient(url, anonKey);
  }
  return client;
}

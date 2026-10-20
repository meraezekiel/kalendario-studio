import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Literal property access so Next inlines them into the client bundle. Trimmed: a stray space pasted
// into a hosting dashboard survives in the realtime URL (?apikey=) and gets every live connection a 401.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let client: SupabaseClient | null = null;

/** True when Supabase is configured; when false every cloud entry point stays hidden. */
export function cloudEnabled(): boolean {
  return !!url && !!anonKey;
}

/** The shared Supabase client, created on first use. Throws when cloud is not configured. */
export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    // PKCE: email links come back to /auth/callback with ?code=, which that page exchanges itself.
    client = createClient(url, anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: false } });
  }
  return client;
}

import { create } from 'zustand';
import type { AuthError, User } from '@supabase/supabase-js';
import { cloudEnabled, supabase } from '@/lib/cloud/supabase';

export type AuthUser = { id: string; email: string; name: string };

/** Where a fresh sign-in lands. */
export const AFTER_SIGN_IN = '/designs';

/** A same-site path from `?next=` (e.g. /d/<id> after a signed-out visit), or AFTER_SIGN_IN. */
export function nextPath(search: string): string {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : AFTER_SIGN_IN;
}

interface AuthState {
  user: AuthUser | null;
  /** True once the stored session (if any) has been read. */
  ready: boolean;
  init(): void;
  signUp(email: string, password: string, name: string): Promise<'check-email'>;
  signIn(email: string, password: string): Promise<void>;
  google(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

function toUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  const email = u.email ?? '';
  const meta = u.user_metadata as { name?: unknown; full_name?: unknown } | undefined;
  const named = typeof meta?.name === 'string' ? meta.name : typeof meta?.full_name === 'string' ? meta.full_name : '';
  return { id: u.id, email, name: named.trim() || email.split('@')[0] };
}

/** Turns a Supabase auth error into a sentence for the person signing in. */
function friendly(e: AuthError): Error {
  switch (e.code) {
    case 'invalid_credentials':
      return new Error("That email and password don't match.");
    case 'email_not_confirmed':
      return new Error('Please confirm your email first. Check your inbox for the link.');
    case 'user_already_exists':
    case 'email_exists':
      return new Error('An account with that email already exists. Try signing in.');
    case 'weak_password':
      return new Error('Please choose a longer password (at least 6 characters).');
    case 'email_address_invalid':
      return new Error('That email address doesn’t look right.');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new Error('Too many tries. Please wait a minute and try again.');
  }
  if (e.status === 429) return new Error('Too many tries. Please wait a minute and try again.');
  return new Error(e.message || 'Something went wrong. Please try again.');
}

const callbackUrl = () => `${location.origin}/auth/callback`;

let started = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,

  init() {
    if (started) return;
    started = true;
    if (!cloudEnabled()) {
      set({ ready: true });
      return;
    }
    // Fires INITIAL_SESSION straight away (from local storage; no network when signed out), then every change.
    supabase().auth.onAuthStateChange((_event, session) => set({ user: toUser(session?.user), ready: true }));
  },

  async signUp(email, password, name) {
    const { error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: callbackUrl() },
    });
    if (error) throw friendly(error);
    return 'check-email';
  },

  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw friendly(error);
  },

  async google() {
    const { error } = await supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } });
    if (error) throw friendly(error);
  },

  async resetPassword(email) {
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
    if (error) throw friendly(error);
  },

  async signOut() {
    const { error } = await supabase().auth.signOut();
    if (error) throw friendly(error);
    set({ user: null });
  },
}));

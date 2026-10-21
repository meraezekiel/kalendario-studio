import { create } from 'zustand';
import type { AuthError, User } from '@supabase/supabase-js';
import { type Approval, approval, listAccounts, waitingCount } from '@/lib/cloud/approval';
import { safeNext } from '@/lib/cloud/safeNext';
import { dirtyDesigns, type DirtyDesign, forgetDirty, isDirty } from '@/lib/cloud/dirty';
import { forgetLocalCopies } from '@/lib/cloud/localCopies';
import { cloudEnabled, supabase } from '@/lib/cloud/supabase';
import { saveAll, useCloudStore } from './useCloudStore';
import { useMyTemplatesStore } from './useMyTemplatesStore';
import { usePhotoUrlStore } from './usePhotoUrlStore';

export type AuthUser = { id: string; email: string; name: string };

/** Shown on the sign-in page to an account the admin hasn't let in. */
export const WAITING_TEXT = {
  pending: 'Your account is waiting for approval. You can sign in once it has been approved.',
  deactivated: 'Your account has been deactivated. Please contact the site owner.',
} as const;

/** Where a fresh sign-in lands. */
export const AFTER_SIGN_IN = '/designs';

/** A same-site path from `?next=` (e.g. /d/<id> after a signed-out visit), or AFTER_SIGN_IN. */
export function nextPath(search: string): string {
  return safeNext(new URLSearchParams(search).get('next'), location.origin, AFTER_SIGN_IN);
}

interface AuthState {
  user: AuthUser | null;
  /** True once the stored session (if any) has been read and its approval checked. */
  ready: boolean;
  /** The signed-in account may approve sign-ups. */
  admin: boolean;
  /** For the admin: sign-ups waiting for approval (the red dot on the avatar). */
  signUps: number;
  /** Re-reads `signUps` (admin only; keeps the old count when it can't be read). */
  countSignUps(): Promise<void>;
  /** Why an account was just turned away (the sign-in page says so): new and waiting, or deactivated. */
  waiting: keyof typeof WAITING_TEXT | null;
  init(): void;
  signUp(email: string, password: string, name: string): Promise<'check-email'>;
  signIn(email: string, password: string): Promise<void>;
  google(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /**
   * Signs out, then deletes this account's data from the browser (offline design copies, downloaded
   * photos, templates). With unsaved cloud edits (and no `force`) it asks first instead: `unsynced`
   * becomes 'ask'. That covers the open design and any other with edits only this browser holds. Resolves true once signed out (the caller then routes to `/`), false when it asked.
   * Never rejects: offline, the session here is cleared anyway.
   */
  signOut(opts?: { force?: boolean }): Promise<boolean>;
  /** The "Wait" answer: saves the pending edits (up to SAVE_WAIT_MS), then signs out. False when they still aren't saved ('stuck') or it was cancelled. */
  waitThenSignOut(): Promise<boolean>;
  /** Keeps editing: drops the question. */
  cancelSignOut(): void;
  /** The sign-out question about unsaved edits: asked, saving them, or saving timed out. */
  unsynced: 'ask' | 'waiting' | 'stuck' | null;
  /** With the question: designs not open here whose edits haven't reached the account ("Wait" can't send those). */
  elsewhere: DirtyDesign[];
  /** True from signing out until the next sign-in: pages that need an account leave it to sign-out's routing. */
  leaving: boolean;
}

/** How long "Wait" waits for the edits to be saved before offering "Sign out anyway" again. */
export const SAVE_WAIT_MS = 15_000;

/** Removes the signed-out account's data from this browser. The signed-out local design stays (it isn't account data). */
async function forgetAccountData() {
  usePhotoUrlStore.getState().clear();
  useMyTemplatesStore.setState({ list: [], loaded: false, owner: null });
  forgetDirty();
  await forgetLocalCopies();
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

/** Approval checks by user id: one request per account per page load; waiting and unread ones are asked again next time. */
const checks = new Map<string, Promise<Approval>>();
function check(id: string): Promise<Approval> {
  let p = checks.get(id);
  if (!p) {
    p = approval(id);
    checks.set(id, p);
    void p.then((a) => a.state !== 'approved' && checks.delete(id));
  }
  return p;
}
const known = new Map<string, Approval>();

export const useAuthStore = create<AuthState>((set, get) => {
  /** Lets a session in once its account is approved; any other is signed out here, with the reason in `waiting`. */
  async function admit(user: AuthUser) {
    const a = await check(user.id);
    known.set(user.id, a);
    // Signed out or switched account meanwhile.
    const { data } = await supabase().auth.getSession();
    if (data.session?.user.id !== user.id) return;
    if (a.state === 'pending' || a.state === 'deactivated') {
      set({ waiting: a.state });
      await supabase().auth.signOut({ scope: 'local' }).catch(() => {});
      set({ user: null, admin: false, ready: true });
      return;
    }
    set({ user, admin: a.state === 'approved' && a.admin, ready: true, leaving: false, waiting: null });
  }

  return {
    user: null,
    ready: false,
    admin: false,
    waiting: null,
    signUps: 0,

    async countSignUps() {
      if (!get().admin) return;
      try {
        set({ signUps: waitingCount(await listAccounts()) });
      } catch {
        // Offline: keep the last count.
      }
    },

    init() {
      if (started) return;
      started = true;
      if (!cloudEnabled()) {
        set({ ready: true });
        return;
      }
      // Fires INITIAL_SESSION straight away (from local storage; no network when signed out), then every change.
      supabase().auth.onAuthStateChange((_event, session) => {
        const user = toUser(session?.user);
        if (!user) return set({ user, admin: false, ready: true });
        const a = known.get(user.id);
        if (a?.state === 'approved') return set({ user, admin: a.admin, ready: true, leaving: false });
        // Supabase calls made inside this callback would wait on its own auth lock: check once it has returned.
        set({ ready: false });
        setTimeout(() => void admit(user), 0);
      });
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
      set({ waiting: null });
      const { data, error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw friendly(error);
      // Resolves once the account is let in, or turned away with `waiting` set.
      const user = toUser(data.user);
      if (user) await admit(user);
    },

    async google() {
      const { error } = await supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } });
      if (error) throw friendly(error);
    },

    async resetPassword(email) {
      const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
      if (error) throw friendly(error);
    },

    unsynced: null,
    elsewhere: [],
    leaving: false,

    async signOut(opts) {
      if (!opts?.force) {
        const { status, designId } = useCloudStore.getState();
        // Designs with unsent edits that aren't open here (closed tab, left for My designs): only opening
        // them online sends those edits.
        const elsewhere = dirtyDesigns().filter((d) => d.id !== designId);
        if (status.pending || (designId && isDirty(designId)) || elsewhere.length) {
          set({ unsynced: 'ask', elsewhere });
          return false;
        }
      }
      set({ unsynced: null, elsewhere: [], leaving: true });
      try {
        const { error } = await supabase().auth.signOut();
        // Offline (or the server is unreachable): forget the session in this browser anyway.
        if (error) await supabase().auth.signOut({ scope: 'local' });
      } catch {
        await supabase().auth.signOut({ scope: 'local' }).catch(() => {});
      }
      set({ user: null });
      await forgetAccountData();
      return true;
    },

    async waitThenSignOut() {
      set({ unsynced: 'waiting' });
      const saved = await saveAll(SAVE_WAIT_MS);
      if (get().unsynced !== 'waiting') return false; // cancelled meanwhile
      if (!saved) {
        set({ unsynced: 'stuck' });
        return false;
      }
      return get().signOut({ force: true });
    },

    cancelSignOut() {
      set({ unsynced: null, elsewhere: [] });
    },
  };
});

import { useRouter } from 'next/navigation';
import type { DirtyDesign } from '@/lib/cloud/dirty';
import { useAuthStore } from '@/store/useAuthStore';

/** Signed out: My designs and cloud designs need an account, so the local editor is the place to be. */
export function useGoHome() {
  const router = useRouter();
  return () => {
    if (location.pathname !== '/') router.push('/');
  };
}

const MESSAGES = {
  ask: "They're kept on this computer until they reach your account. If you sign out now, they'll be lost.",
  waiting: 'Saving your changes…',
  stuck: "We couldn't save your changes. Check your internet connection and try again, or sign out anyway.",
} as const;

/** The question when the unsent edits belong to designs not open here: only opening them sends them. */
function elsewhereMessage(designs: DirtyDesign[]): string {
  if (designs.length > 1) {
    return `Changes to ${designs.length} designs are kept on this computer until they reach your account. Open each of them while online so they can sync. If you sign out now, they'll be lost.`;
  }
  const name = designs[0].name ? `“${designs[0].name}”` : 'that design';
  return `Some changes are kept on this computer until they reach your account. Open ${name} while online so it can sync. If you sign out now, they'll be lost.`;
}

/** The sign-out question about unsaved cloud edits: Wait (or open the design), Sign out anyway, or keep editing. */
export function useSignOutConfirmHandler() {
  const router = useRouter();
  const unsynced = useAuthStore((s) => s.unsynced);
  const elsewhere = useAuthStore((s) => s.elsewhere);
  const goHome = useGoHome();
  const auth = () => useAuthStore.getState();
  const away = elsewhere.length > 0;
  return {
    state: unsynced,
    message: !unsynced ? '' : away ? elsewhereMessage(elsewhere) : MESSAGES[unsynced],
    waiting: unsynced === 'waiting',
    /** True when the edits are in designs not open here: "Open design" instead of "Wait". */
    away,
    wait: async () => {
      if (await auth().waitThenSignOut()) goHome();
    },
    open: () => {
      const id = elsewhere[0]?.id;
      auth().cancelSignOut();
      if (id) router.push(`/d/${id}`);
    },
    signOutAnyway: async () => {
      if (await auth().signOut({ force: true })) goHome();
    },
    cancel: () => auth().cancelSignOut(),
  };
}

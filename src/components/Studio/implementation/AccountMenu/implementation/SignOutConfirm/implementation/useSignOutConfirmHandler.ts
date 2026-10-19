import { useRouter } from 'next/navigation';
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

/** The sign-out question about unsaved cloud edits: Wait, Sign out anyway, or keep editing. */
export function useSignOutConfirmHandler() {
  const unsynced = useAuthStore((s) => s.unsynced);
  const goHome = useGoHome();
  const auth = () => useAuthStore.getState();
  return {
    state: unsynced,
    message: unsynced ? MESSAGES[unsynced] : '',
    waiting: unsynced === 'waiting',
    wait: async () => {
      if (await auth().waitThenSignOut()) goHome();
    },
    signOutAnyway: async () => {
      if (await auth().signOut({ force: true })) goHome();
    },
    cancel: () => auth().cancelSignOut(),
  };
}

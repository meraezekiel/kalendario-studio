import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cloudEnabled } from '@/lib/cloud/supabase';
import { nextPath, useAuthStore } from '@/store/useAuthStore';

export type AuthTab = 'signin' | 'signup' | 'forgot';

export const TABS: { id: AuthTab; label: string }[] = [
  { id: 'signin', label: 'Sign in' },
  { id: 'signup', label: 'Create account' },
  { id: 'forgot', label: 'Forgot password' },
];

export function useAuthHandler() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<AuthTab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** A "check your email" note after sign-up or a reset request. */
  const [sent, setSent] = useState('');

  useEffect(() => useAuthStore.getState().init(), []);
  // Signed in (just now, or already): go on to the app.
  useEffect(() => {
    if (user) router.replace(nextPath(location.search));
  }, [user, router]);

  const choose = (t: AuthTab) => {
    setTab(t);
    setError('');
    setSent('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSent('');
    const auth = useAuthStore.getState();
    try {
      if (tab === 'signin') {
        await auth.signIn(email.trim(), password);
      } else if (tab === 'signup') {
        await auth.signUp(email.trim(), password, name);
        setSent(`Check your email. We sent a link to ${email.trim()} to confirm your account.`);
        setPassword('');
      } else {
        await auth.resetPassword(email.trim());
        setSent('Check your email for a reset link.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      await useAuthStore.getState().google();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return {
    enabled: cloudEnabled(),
    showGoogle: process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1',
    tab,
    choose,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    busy,
    error,
    sent,
    submit,
    google,
  };
}

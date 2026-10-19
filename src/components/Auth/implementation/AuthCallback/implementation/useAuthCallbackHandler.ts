import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cloudEnabled, supabase } from '@/lib/cloud/supabase';
import { AFTER_SIGN_IN } from '@/store/useAuthStore';

type Phase = 'working' | 'new-password' | 'failed';

/** Finishes an email link (confirm sign-up, reset password, or OAuth): swaps ?code= for a session. */
export function useAuthCallbackHandler() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('working');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return; // a code can be exchanged only once (StrictMode runs effects twice)
    once.current = true;
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const linkError = params.get('error_description');
    if (!cloudEnabled() || !code) {
      setError(linkError || 'This link is missing its code. Please open the link from your email again.');
      setPhase('failed');
      return;
    }
    supabase()
      .auth.exchangeCodeForSession(code)
      .then(({ data, error: e }) => {
        // auth-js returns redirectType ('recovery' for a reset link) but its types leave it out.
        const recovery = (data as { redirectType?: string | null }).redirectType === 'recovery';
        if (e) {
          setError('This link has expired or was already used. Please sign in, or ask for a new link.');
          setPhase('failed');
        } else if (recovery) {
          setPhase('new-password');
        } else {
          router.replace(AFTER_SIGN_IN);
        }
      });
  }, [router]);

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const { error: e2 } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (e2) setError(e2.code === 'weak_password' ? 'Please choose a longer password (at least 6 characters).' : e2.message);
    else router.replace(AFTER_SIGN_IN);
  };

  return { phase, error, password, setPassword, busy, savePassword };
}

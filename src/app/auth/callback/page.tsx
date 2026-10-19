import type { Metadata } from 'next';
import AuthCallback from '@/components/Auth/implementation/AuthCallback/implementation/AuthCallback';

export const metadata: Metadata = { title: 'Signing in · Kalendaryo Studio' };

export default function AuthCallbackPage() {
  return <AuthCallback />;
}

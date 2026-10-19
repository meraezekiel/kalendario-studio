import type { Metadata } from 'next';
import Auth from '@/components/Auth/implementation/Auth';

export const metadata: Metadata = { title: 'Sign in · Kalendaryo Studio' };

export default function LoginPage() {
  return <Auth />;
}

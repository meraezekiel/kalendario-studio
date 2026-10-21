import type { Metadata } from 'next';
import Admin from '@/components/Admin/implementation/Admin';

export const metadata: Metadata = { title: 'Accounts · Kalendaryo Studio' };

export default function AdminPage() {
  return <Admin />;
}

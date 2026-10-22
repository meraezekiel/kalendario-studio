import type { Metadata } from 'next';
import AdminStats from '@/components/AdminStats/implementation/AdminStats';

export const metadata: Metadata = { title: 'Stats · Kalendaryo Studio' };

export default function AdminStatsPage() {
  return <AdminStats />;
}

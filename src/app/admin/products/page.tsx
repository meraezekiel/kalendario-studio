import type { Metadata } from 'next';
import AdminProducts from '@/components/AdminProducts/implementation/AdminProducts';

export const metadata: Metadata = { title: 'Products · Kalendaryo Studio' };

export default function AdminProductsPage() {
  return <AdminProducts />;
}

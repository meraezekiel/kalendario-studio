import type { Metadata } from 'next';
import Designs from '@/components/Designs/implementation/Designs';

export const metadata: Metadata = { title: 'My designs · Kalendaryo Studio' };

export default function DesignsPage() {
  return <Designs />;
}

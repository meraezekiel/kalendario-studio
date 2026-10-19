import type { Metadata } from 'next';
import Studio from '@/components/Studio/implementation/Studio';

export const metadata: Metadata = { title: 'Kalendaryo Studio' };

/** A cloud design in the editor. */
export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Studio designId={id} />;
}

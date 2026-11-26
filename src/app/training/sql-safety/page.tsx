import { notFound } from 'next/navigation';
import SqlSafetyLab from '@/components/security/SqlSafetyLab';

export const dynamic = 'force-dynamic';

export default function SqlSafetyTrainingPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return <SqlSafetyLab />;
}

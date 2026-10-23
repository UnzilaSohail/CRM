import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';
import type { Me } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await apiGet<Me>('/auth/me');
  if (!me.ok) redirect('/login');
  if (me.data.role === 'CUSTOMER') redirect('/portal');
  return <AppShell role={me.data.role}>{children}</AppShell>;
}

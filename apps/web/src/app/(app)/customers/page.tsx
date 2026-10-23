import { AccessDenied, LoadError } from '@/components/access-denied';
import { Badge, Card, EmptyState, PageHeader, statusTone } from '@/components/ui';
import { apiGet } from '@/lib/api';
import type { CustomerPage, Me } from '@/lib/types';
import { ArchiveButton, CustomerForm } from './customer-actions';

const filters = ['ALL', 'ACTIVE', 'PROSPECT', 'ARCHIVED'] as const;
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; industry?: string; cursor?: string }>;
}) {
  const sp = await searchParams;
  const status =
    filters.includes(sp.status as never) && sp.status !== 'ALL' ? sp.status : undefined;
  const qs = new URLSearchParams();
  if (sp.q) qs.set('q', sp.q);
  if (sp.industry) qs.set('industry', sp.industry);
  if (status) qs.set('status', status);
  if (sp.cursor) qs.set('cursor', sp.cursor);

  const [list, me] = await Promise.all([
    apiGet<CustomerPage>(`/customers?${qs}`),
    apiGet<Me>('/auth/me'),
  ]);
  const canWrite = me.ok && me.data.role === 'CEO';

  return (
    <>
      <PageHeader title="Customers" subtitle="Manage your customers and their lifecycle" />
      {!list.ok ? (
        'denied' in list ? (
          <AccessDenied what="customers" />
        ) : (
          <LoadError message={list.error} />
        )
      ) : (
        <div className="space-y-4">
          {canWrite && <CustomerForm />}
          <Card>
            <form method="get" className="mb-4 flex flex-wrap items-center gap-3" role="search">
              <input
                type="search"
                name="q"
                defaultValue={sp.q ?? ''}
                className="input max-w-xs"
                placeholder="Search customers"
                aria-label="Search customers"
              />
              <select
                name="status"
                defaultValue={status ?? 'ALL'}
                className="input w-auto"
                aria-label="Lifecycle status"
              >
                {filters.map((f) => (
                  <option key={f} value={f}>
                    {f === 'ALL' ? 'All (not archived)' : label(f)}
                  </option>
                ))}
              </select>
              <button className="btn-ghost">Apply</button>
            </form>

            {list.data.items.length === 0 ? (
              <EmptyState title="No customers match" hint="Try a different search or filter." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Customer</th>
                      <th>Industry</th>
                      <th>Country</th>
                      <th>Status</th>
                      {canWrite && <th />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.data.items.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-navy">{c.name}</td>
                        <td>{c.industry ?? '—'}</td>
                        <td>{c.country ?? '—'}</td>
                        <td>
                          <Badge tone={statusTone(label(c.status))}>{label(c.status)}</Badge>
                        </td>
                        {canWrite && (
                          <td className="text-right">
                            {c.status !== 'ARCHIVED' && <ArchiveButton id={c.id} name={c.name} />}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {list.data.nextCursor && (
              <a
                className="btn-ghost mt-4"
                href={`?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(status ? { status } : {}), cursor: list.data.nextCursor })}`}
              >
                Next page
              </a>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

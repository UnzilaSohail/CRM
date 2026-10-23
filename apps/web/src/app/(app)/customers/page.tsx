'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader, statusTone } from '@/components/ui';
import { customers } from '@/lib/data';

const filters = ['All', 'Active', 'Prospect', 'Archived'] as const;

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof filters)[number]>('All');
  const rows = useMemo(
    () =>
      customers.filter(
        (c) =>
          (f === 'All' || c.status === f) &&
          `${c.name} ${c.industry} ${c.contact}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, f],
  );

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Manage your customers and opportunities"
        actions={
          <button className="btn-primary">
            <Plus size={16} aria-hidden /> Add customer
          </button>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            className="input max-w-xs"
            placeholder="Search customers"
            aria-label="Search customers"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div role="tablist" aria-label="Lifecycle filter" className="flex gap-1">
            {filters.map((x) => (
              <button
                key={x}
                role="tab"
                aria-selected={f === x}
                onClick={() => setF(x)}
                className={
                  f === x ? 'btn bg-brand-50 text-brand' : 'btn text-slate-600 hover:bg-slate-100'
                }
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No customers match" hint="Try a different search or filter." />
        ) : (
          <>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Customer</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Projects</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-navy">{c.name}</td>
                    <td>{c.industry}</td>
                    <td>{c.contact}</td>
                    <td className="text-slate-500">{c.phone}</td>
                    <td className="tabular-nums">{c.projects}</td>
                    <td>
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="space-y-3 md:hidden">
              {rows.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-navy">{c.name}</span>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="text-slate-500">
                    {c.industry} · {c.contact}
                  </p>
                  <p className="text-slate-400">{c.projects} projects</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

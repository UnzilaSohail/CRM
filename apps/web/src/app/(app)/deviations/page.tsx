'use client';

import { useState } from 'react';
import { Badge, Card, EmptyState, PageHeader, statusTone } from '@/components/ui';
import { customerName, projectKpi, projects } from '@/lib/data';

export default function DeviationsPage() {
  const [acked, setAcked] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [cause, setCause] = useState('');

  const rows = projects
    .map((p) => ({ p, k: projectKpi(p) }))
    .filter((x) => x.k.severity !== 'none')
    .sort((a, b) => b.k.negativeDeviation - a.k.negativeDeviation);

  return (
    <>
      <PageHeader
        title="Deviation Center"
        subtitle="25–49% watch · 50% and above critical, with required explanation"
      />
      {rows.length === 0 ? (
        <EmptyState title="No deviations" hint="All projects are within tolerance." />
      ) : (
        <div className="space-y-3">
          {rows.map(({ p, k }) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {customerName(p.customerId)} · Planned {k.planned.toFixed(0)}% · Actual{' '}
                    {k.actual.toFixed(0)}%
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(k.severity)}>
                    {k.severity === 'critical' ? 'Critical' : 'Watch'} ·{' '}
                    {k.negativeDeviation.toFixed(0)}%
                  </Badge>
                  {acked[p.id] !== undefined ? (
                    <Badge tone="success">Acknowledged</Badge>
                  ) : (
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setOpen(p.id);
                        setCause('');
                      }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
              {open === p.id && (
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (k.severity === 'critical' && !cause.trim()) return;
                    setAcked({ ...acked, [p.id]: cause });
                    setOpen(null);
                  }}
                >
                  <input
                    className="input"
                    aria-label="Cause and recovery action"
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    placeholder={
                      k.severity === 'critical'
                        ? 'Cause and recovery action (required)'
                        : 'Cause (optional)'
                    }
                  />
                  <button className="btn-primary">Submit</button>
                </form>
              )}
              {acked[p.id] !== undefined && (
                <p className="mt-2 text-sm text-slate-500">Cause: {acked[p.id] || '—'}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

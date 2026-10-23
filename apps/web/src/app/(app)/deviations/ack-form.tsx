'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, statusTone } from '@/components/ui';
import type { DeviationRow } from '@/lib/types';

export function AckForm({ row }: { row: DeviationRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cause, setCause] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const critical = row.severity === 'critical';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (critical && !cause.trim()) return setError('A cause is required for critical deviations.');
    setBusy(true);
    setError('');
    const res = await fetch(`/api/proxy/deviations/${row.projectId}/acknowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ severity: row.severity, cause }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      return router.refresh();
    }
    setError(res.status === 409 ? 'Already acknowledged.' : 'Could not acknowledge. Try again.');
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-navy">{row.project}</p>
          <p className="text-xs text-slate-500">
            {row.customer} · Planned {row.planned.toFixed(0)}% · Actual {row.actual.toFixed(0)}%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone(row.severity)}>
            {critical ? 'Critical' : 'Watch'} · {row.negativeDeviation.toFixed(0)}%
          </Badge>
          {row.acknowledged ? (
            <Badge tone="success">Acknowledged</Badge>
          ) : (
            <button className="btn-ghost" onClick={() => setOpen(true)}>
              Acknowledge
            </button>
          )}
        </div>
      </div>
      {open && !row.acknowledged && (
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <input
            className="input"
            aria-label="Cause and recovery action"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            placeholder={critical ? 'Cause and recovery action (required)' : 'Cause (optional)'}
          />
          <button className="btn-primary" disabled={busy}>
            Submit
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {row.acknowledged && <p className="mt-2 text-sm text-slate-500">Cause: {row.cause ?? '—'}</p>}
    </>
  );
}

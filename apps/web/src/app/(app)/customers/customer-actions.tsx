'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui';

interface Duplicate {
  id: string;
  name: string;
}

export function CustomerForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [busy, setBusy] = useState(false);

  async function create(force: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/customers${force ? '?force=true' : ''}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(industry ? { industry } : {}),
          ...(country ? { country } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) return setDuplicates(body.duplicates ?? []);
      if (!res.ok) {
        return setError(
          res.status === 400
            ? 'Enter a customer name of at least 2 characters.'
            : (body.message ?? 'Could not save.'),
        );
      }
      setName('');
      setIndustry('');
      setCountry('');
      setDuplicates([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Add customer">
      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setDuplicates([]);
          void create(false);
        }}
      >
        <input
          className="input"
          placeholder="Name"
          aria-label="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Industry"
          aria-label="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
        <input
          className="input"
          placeholder="Country"
          aria-label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <button className="btn-primary" disabled={busy || !name.trim()}>
          <Plus size={16} aria-hidden /> Add customer
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {duplicates.length > 0 && (
        <div role="alert" className="mt-3 rounded-lg bg-warning-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            Possible duplicate: {duplicates.map((d) => d.name).join(', ')}
          </p>
          <button className="btn-ghost mt-2" onClick={() => void create(true)} disabled={busy}>
            Create anyway
          </button>
        </div>
      )}
    </Card>
  );
}

export function ArchiveButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      aria-label={`Archive ${name}`}
      onClick={async () => {
        if (!window.confirm(`Archive ${name}? You can still find it under the Archived filter.`))
          return;
        setBusy(true);
        await fetch(`/api/proxy/customers/${id}/archive`, { method: 'POST' });
        setBusy(false);
        router.refresh();
      }}
    >
      Archive
    </button>
  );
}

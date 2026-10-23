'use client';

import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const [watch, setWatch] = useState(25);
  const [critical, setCritical] = useState(50);
  const [saved, setSaved] = useState(false);
  const invalid = watch <= 0 || critical <= watch || critical > 100;

  return (
    <>
      <PageHeader title="Settings" subtitle="KPI thresholds, roles and notifications" />
      <Card title="Deviation thresholds" className="max-w-lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) setSaved(true);
          }}
        >
          <label className="block text-sm">
            Watch at (% negative deviation)
            <input
              type="number"
              className="input mt-1"
              value={watch}
              onChange={(e) => {
                setWatch(+e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label className="block text-sm">
            Critical at (%)
            <input
              type="number"
              className="input mt-1"
              value={critical}
              onChange={(e) => {
                setCritical(+e.target.value);
                setSaved(false);
              }}
            />
          </label>
          {invalid && (
            <p role="alert" className="text-sm text-danger">
              Critical must be higher than watch, and at most 100.
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-success">
              Saved (demo only, not persisted).
            </p>
          )}
          <button className="btn-primary" disabled={invalid}>
            Save
          </button>
        </form>
      </Card>
    </>
  );
}

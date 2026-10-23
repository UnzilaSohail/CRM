import { AccessDenied, LoadError } from '@/components/access-denied';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { apiGet } from '@/lib/api';
import type { DeviationRow } from '@/lib/types';
import { AckForm } from './ack-form';

export default async function DeviationsPage() {
  const res = await apiGet<DeviationRow[]>('/deviations');
  return (
    <>
      <PageHeader
        title="Deviation Center"
        subtitle="25–49% watch · 50% and above critical, with a required explanation"
      />
      {!res.ok ? (
        'denied' in res ? (
          <AccessDenied what="the deviation center" />
        ) : (
          <LoadError message={res.error} />
        )
      ) : res.data.length === 0 ? (
        <EmptyState title="No deviations" hint="All projects are within tolerance." />
      ) : (
        <div className="space-y-3">
          {res.data.map((d) => (
            <Card key={d.projectId}>
              <AckForm row={d} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

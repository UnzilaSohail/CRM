import { AccessDenied, LoadError } from '@/components/access-denied';
import { Badge, Card, EmptyState, Progress, statusTone } from '@/components/ui';
import { apiGet } from '@/lib/api';
import type { PortalProject } from '@/lib/types';
import { SignOutButton } from './sign-out';

/** Client view: only what the API publishes for this customer. No internal notes, attendance or costs. */
export default async function PortalPage() {
  const res = await apiGet<PortalProject[]>('/portal/projects');

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <header className="flex items-center justify-between rounded-xl bg-navy p-4 text-white">
        <h1 className="font-semibold">AiNetworks · Client portal</h1>
        <SignOutButton />
      </header>

      {!res.ok ? (
        'denied' in res ? (
          <AccessDenied what="the client portal" />
        ) : (
          <LoadError message={res.error} />
        )
      ) : res.data.length === 0 ? (
        <EmptyState title="Nothing has been shared with you yet" />
      ) : (
        res.data.map((p) => (
          <div key={p.id} className="space-y-4">
            <Card title={p.name}>
              <p className="mb-2 text-sm text-slate-500">Target completion {p.due}</p>
              <Progress value={p.progress} label="Overall progress" />
            </Card>
            <Card title="Milestones">
              <ol className="space-y-3 text-sm">
                {p.milestones.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-2">
                    <span>{m.name}</span>
                    <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        ))
      )}
    </main>
  );
}

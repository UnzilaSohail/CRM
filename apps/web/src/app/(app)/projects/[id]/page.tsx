import { notFound } from 'next/navigation';
import { AlertTriangle, Gauge, Target } from 'lucide-react';
import { AccessDenied, LoadError } from '@/components/access-denied';
import { Badge, Card, KpiCard, PageHeader, Progress, statusTone } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { riskLabel } from '@/lib/risk';
import type { ProjectDetail } from '@/lib/types';

const milestoneStatus = (pct: number) =>
  pct >= 100 ? 'Done' : pct > 0 ? 'In progress' : 'Not started';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiGet<ProjectDetail>(`/projects/${id}`);
  if (!res.ok) {
    if ('denied' in res) return <AccessDenied what="this project" />;
    // The API answers 400/404 for unknown or malformed ids.
    if (/\((400|404)\)/.test(res.error)) notFound();
    return <LoadError message={res.error} />;
  }
  const p = res.data;

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${p.customer} · Due ${p.due} · Baseline v${p.baselineVersion}`}
        actions={<Badge tone={statusTone(riskLabel[p.severity])}>{riskLabel[p.severity]}</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={Target}
          label="Planned progress"
          value={`${p.planned.toFixed(0)}%`}
          tone="neutral"
        />
        <KpiCard icon={Gauge} label="Actual progress" value={`${p.actual.toFixed(0)}%`} />
        <KpiCard
          icon={AlertTriangle}
          label="Negative deviation"
          value={`${p.negativeDeviation.toFixed(0)}%`}
          tone={statusTone(p.severity)}
          hint={
            p.severity === 'critical'
              ? 'Critical (50% and above)'
              : p.severity === 'watch'
                ? 'Watch (25–49%)'
                : 'Within tolerance'
          }
        />
      </div>

      <div className="mt-4">
        <Card title="Milestones (weighted)">
          <ol className="space-y-4">
            {p.milestones.map((m) => (
              <li key={m.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {m.name} <span className="text-slate-400">· weight {m.weight}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {!m.clientVisible && <Badge>Internal</Badge>}
                    <Badge tone={statusTone(milestoneStatus(m.percentComplete))}>
                      {milestoneStatus(m.percentComplete)}
                    </Badge>
                  </span>
                </div>
                <Progress value={m.percentComplete} label={m.name} />
                <p className="mt-1 text-xs text-slate-400">
                  {m.plannedStart} → {m.plannedEnd}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

import { notFound } from 'next/navigation';
import { Badge, Card, KpiCard, PageHeader, Progress, statusTone } from '@/components/ui';
import { Gauge, Target, AlertTriangle } from 'lucide-react';
import { customerName, milestoneStatusOf, projectKpi, projects, tasks } from '@/lib/data';

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = projects.find((x) => x.id === id);
  if (!p) notFound();
  const k = projectKpi(p);
  const projectTasks = tasks.filter((t) => t.project === p.name);

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${customerName(p.customerId)} · Manager ${p.manager} · Due ${p.due}`}
        actions={<Badge tone={statusTone(p.status)}>{p.status}</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={Target}
          label="Planned progress"
          value={`${k.planned.toFixed(0)}%`}
          tone="neutral"
        />
        <KpiCard icon={Gauge} label="Actual progress" value={`${k.actual.toFixed(0)}%`} />
        <KpiCard
          icon={AlertTriangle}
          label="Negative deviation"
          value={`${k.negativeDeviation.toFixed(0)}%`}
          tone={statusTone(k.severity)}
          hint={
            k.severity === 'critical'
              ? 'Critical (≥50%)'
              : k.severity === 'watch'
                ? 'Watch (25–49%)'
                : 'Within tolerance'
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Milestones (weighted)">
          <ol className="space-y-4">
            {p.milestones.map((m, i) => (
              <li key={i}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Milestone {i + 1} <span className="text-slate-400">· weight {m.weight}</span>
                  </span>
                  <Badge tone={statusTone(milestoneStatusOf(m.percentComplete))}>
                    {milestoneStatusOf(m.percentComplete)}
                  </Badge>
                </div>
                <Progress value={m.percentComplete} label={`Milestone ${i + 1}`} />
                <p className="mt-1 text-xs text-slate-400">
                  {m.plannedStart} → {m.plannedEnd}
                </p>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Tasks">
          {projectTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {projectTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span>
                    {t.title}
                    <span className="block text-xs text-slate-400">
                      {t.assignee} · due {t.due}
                    </span>
                  </span>
                  <Badge tone={statusTone(t.priority)}>{t.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

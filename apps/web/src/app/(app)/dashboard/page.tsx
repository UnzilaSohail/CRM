import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FolderKanban, Timer, UserCheck, Users } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  Progress,
  statusTone,
} from '@/components/ui';
import { apiGet } from '@/lib/api';
import { riskLabel } from '@/lib/risk';
import type { CustomerPage, ProjectSummary } from '@/lib/types';
import { activity, tasks } from '@/lib/data';

const statuses = [
  { label: 'Completed', color: '#139A72' },
  { label: 'In Progress', color: '#2458E8' },
  { label: 'Under Review', color: '#E5A23B' },
  { label: 'To Do', color: '#94A3B8' },
] as const;

function Donut({ parts, total }: { parts: { value: number; color: string }[]; total: number }) {
  const r = 52,
    c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg
      viewBox="0 0 140 140"
      className="h-40 w-40"
      role="img"
      aria-label={`${total} tasks by status`}
    >
      {parts.map((p, i) => {
        const len = (p.value / total) * c;
        const el = (
          <circle
            key={i}
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="16"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" className="fill-navy text-2xl font-semibold">
        {total}
      </text>
      <text x="70" y="86" textAnchor="middle" className="fill-slate-400 text-[10px]">
        Total Tasks
      </text>
    </svg>
  );
}

export default async function DashboardPage() {
  const [projects, customers] = await Promise.all([
    apiGet<ProjectSummary[]>('/projects'),
    apiGet<CustomerPage>('/customers?limit=100'),
  ]);
  const list = projects.ok ? projects.data : [];
  const critical = list.filter((p) => p.severity === 'critical').length;
  const flagged = list.filter((p) => p.severity !== 'none');

  // Task, attendance and activity figures are still sample data until those modules have APIs.
  const counts = statuses.map((s) => ({
    ...s,
    value: tasks.filter((t) => t.status === s.label).length,
  }));
  const done = counts[0]!.value;

  return (
    <>
      <PageHeader title="Good morning" subtitle="Here's what's happening across your portfolio" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label="Customers"
          value={customers.ok ? String(customers.data.items.length) : '—'}
        />
        <KpiCard
          icon={FolderKanban}
          label="Active Projects"
          value={String(list.length)}
          tone="info"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Task Completion"
          value={`${Math.round((done / tasks.length) * 100)}%`}
          hint="Sample data"
          tone="success"
        />
        <KpiCard
          icon={Timer}
          label="On-Time Delivery"
          value="91%"
          hint="Sample data"
          tone="warning"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Critical Alerts"
          value={String(critical)}
          tone="danger"
          hint="50% deviation or more"
        />
        <KpiCard
          icon={UserCheck}
          label="Team Attendance"
          value="96%"
          hint="Sample data"
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Project progress overview"
          className="lg:col-span-2"
          action={
            <Link href="/projects" className="text-xs text-brand">
              View all
            </Link>
          }
        >
          <p className="mb-3 text-xs text-slate-500">Planned and actual are shown separately.</p>
          {list.length === 0 ? (
            <EmptyState title="No projects to show" />
          ) : (
            <ul className="space-y-4">
              {list.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {p.name}
                    </Link>
                    <Badge tone={statusTone(riskLabel[p.severity])}>{riskLabel[p.severity]}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Progress value={p.planned} tone="neutral" label={`${p.name} planned`} />
                    <Progress
                      value={p.actual}
                      tone={p.severity === 'critical' ? 'danger' : 'info'}
                      label={`${p.name} actual`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Planned {p.planned.toFixed(0)}% · Actual {p.actual.toFixed(0)}% · {p.customer}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tasks by status (sample)">
          <div className="flex flex-col items-center gap-4">
            <Donut parts={counts} total={tasks.length} />
            <ul className="w-full space-y-1.5 text-sm">
              {counts.map((c) => (
                <li key={c.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c.color }}
                      aria-hidden
                    />
                    {c.label}
                  </span>
                  <span className="tabular-nums text-slate-500">{c.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card
          title="Deviation alerts"
          action={
            <Link href="/deviations" className="text-xs text-brand">
              Open center
            </Link>
          }
        >
          {flagged.length === 0 ? (
            <p className="text-sm text-slate-500">No project is off plan.</p>
          ) : (
            <ul className="space-y-3">
              {flagged.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge tone={statusTone(p.severity)}>
                    {p.negativeDeviation.toFixed(0)}% behind
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent activity (sample)" className="lg:col-span-2">
          <ul className="divide-y divide-slate-100">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <b className="font-medium text-navy">{a.who}</b> {a.what}{' '}
                  <span className="text-slate-400">· {a.where}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{a.when}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

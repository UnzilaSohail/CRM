import Link from 'next/link';
import { AccessDenied, LoadError } from '@/components/access-denied';
import { Badge, Card, EmptyState, PageHeader, Progress, statusTone } from '@/components/ui';
import { apiGet } from '@/lib/api';
import { riskLabel } from '@/lib/risk';
import type { ProjectSummary } from '@/lib/types';

export default async function ProjectsPage() {
  const res = await apiGet<ProjectSummary[]>('/projects');
  return (
    <>
      <PageHeader title="Projects" subtitle="Owner, due date, completion and risk" />
      {!res.ok ? (
        'denied' in res ? (
          <AccessDenied what="projects" />
        ) : (
          <LoadError message={res.error} />
        )
      ) : res.data.length === 0 ? (
        <EmptyState title="No projects yet" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Project</th>
                  <th>Customer</th>
                  <th>Due</th>
                  <th className="w-40">Planned</th>
                  <th className="w-40">Actual</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {res.data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-medium text-navy hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td>{p.customer}</td>
                    <td className="tabular-nums text-slate-500">{p.due}</td>
                    <td>
                      <Progress value={p.planned} tone="neutral" label="Planned" />
                    </td>
                    <td>
                      <Progress value={p.actual} label="Actual" />
                    </td>
                    <td>
                      <Badge tone={statusTone(riskLabel[p.severity])}>
                        {riskLabel[p.severity]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Card, PageHeader, Progress, statusTone } from "@/components/ui";
import { customerName, projectKpi, projects } from "@/lib/data";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" subtitle="Owner, due date, completion and risk"
        actions={<button className="btn-primary"><Plus size={16} aria-hidden /> New project</button>} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr><th className="py-2">Project</th><th>Customer</th><th>Manager</th><th>Due</th><th className="w-40">Planned</th><th className="w-40">Actual</th><th>Risk</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const k = projectKpi(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3"><Link href={`/projects/${p.id}`} className="font-medium text-navy hover:underline">{p.name}</Link></td>
                    <td>{customerName(p.customerId)}</td><td>{p.manager}</td>
                    <td className="tabular-nums text-slate-500">{p.due}</td>
                    <td><Progress value={k.planned} tone="neutral" label="Planned" /></td>
                    <td><Progress value={k.actual} label="Actual" /></td>
                    <td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

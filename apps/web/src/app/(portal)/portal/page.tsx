import Link from "next/link";
import { Badge, Card, Progress, statusTone } from "@/components/ui";
import { milestoneStatusOf, projectKpi, projects } from "@/lib/data";

/** Client view: only explicitly published data. No internal comments, attendance, costs or staffing KPIs. */
export default function PortalPage() {
  const p = projects[0]!;
  const k = projectKpi(p);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <header className="flex items-center justify-between rounded-xl bg-navy p-4 text-white">
        <span className="font-semibold">AiNetworks · Client Portal</span>
        <Link href="/dashboard" className="text-xs underline">Back to internal view</Link>
      </header>

      <Card title={p.name}>
        <p className="mb-2 text-sm text-slate-500">Target completion {p.due}</p>
        <Progress value={k.actual} label="Overall progress" />
      </Card>

      <Card title="Milestones">
        <ol className="space-y-3 text-sm">
          {p.milestones.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span>Milestone {i + 1}</span>
              <Badge tone={statusTone(milestoneStatusOf(m.percentComplete))}>{milestoneStatusOf(m.percentComplete)}</Badge>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Approvals">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Settlement endpoints specification v2</span>
          <span className="flex gap-2">
            <button className="btn-primary">Approve</button>
            <button className="btn-ghost">Request changes</button>
          </span>
        </div>
      </Card>
    </main>
  );
}

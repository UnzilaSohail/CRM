import { Card, PageHeader, Progress } from '@/components/ui';
import { customerName, customers, projectKpi, projects, team } from '@/lib/data';

export default function KpiPage() {
  const byCustomer = customers
    .map((c) => {
      const ps = projects.filter((p) => p.customerId === c.id).map((p) => projectKpi(p));
      const avg = (f: (k: (typeof ps)[number]) => number) =>
        ps.length ? ps.reduce((s, k) => s + f(k), 0) / ps.length : null;
      return { c, planned: avg((k) => k.planned), actual: avg((k) => k.actual) };
    })
    .filter((x) => x.planned !== null);

  return (
    <>
      <PageHeader
        title="KPI Scorecard"
        subtitle="Target vs actual by project, customer and employee"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Projects">
          <ul className="space-y-4 text-sm">
            {projects.map((p) => {
              const k = projectKpi(p);
              return (
                <li key={p.id}>
                  <p className="mb-1 font-medium text-navy">{p.name}</p>
                  <Progress value={k.planned} tone="neutral" label="Planned" />
                  <Progress value={k.actual} label="Actual" />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Customers">
          <ul className="space-y-4 text-sm">
            {byCustomer.map(({ c, planned, actual }) => (
              <li key={c.id}>
                <p className="mb-1 font-medium text-navy">{customerName(c.id)}</p>
                <Progress value={planned!} tone="neutral" label="Planned" />
                <Progress value={actual!} label="Actual" />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Employees (task completion)">
          <ul className="space-y-4 text-sm">
            {team.map((t) => (
              <li key={t.name}>
                <p className="mb-1 font-medium text-navy">{t.name}</p>
                <Progress
                  value={t.score}
                  tone={t.score < 50 ? 'danger' : 'success'}
                  label={t.name}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Customer rollup is a simple average pending the signed-off KPI dictionary.
      </p>
    </>
  );
}

import { Download } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

const reports = [
  'Management scorecard',
  'Project health',
  'Attendance summary',
  'Time and utilization',
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Filtered exports. Large exports run in the background."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r} title={r}>
            <div className="flex flex-wrap gap-2">
              {['CSV', 'XLSX', 'PDF'].map((f) => (
                <button
                  key={f}
                  className="btn-ghost"
                  disabled
                  title="Available once the export service is built"
                >
                  <Download size={14} aria-hidden /> {f}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

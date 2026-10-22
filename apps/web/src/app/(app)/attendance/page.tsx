import { Badge, Card, PageHeader } from "@/components/ui";
import { attendanceLog } from "@/lib/data";

export default function AttendancePage() {
  return (
    <>
      <PageHeader title="Attendance" subtitle="Check-ins, exceptions and leave" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr><th className="py-2">Day</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Mode</th><th>Flag</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLog.map((r) => (
                <tr key={r.day}>
                  <td className="py-3 font-medium text-navy">{r.day}</td>
                  <td className="tabular-nums">{r.in}</td><td className="tabular-nums">{r.out}</td>
                  <td className="tabular-nums">{r.hours}</td><td>{r.mode}</td>
                  <td>{r.flag && <Badge tone={r.flag === "Late" ? "warning" : "info"}>{r.flag}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

"use client";

import { useState } from "react";
import { Badge, Card, KpiCard, PageHeader, Progress, statusTone } from "@/components/ui";
import { CheckSquare, Clock, Gauge } from "lucide-react";
import { tasks } from "@/lib/data";

export default function MyDayPage() {
  const [checkedIn, setCheckedIn] = useState(true);
  const [note, setNote] = useState("");
  const [log, setLog] = useState([
    { text: "Updated task progress to 40%", at: "10:42" },
    { text: "Logged 1h 30m on Core API migration", at: "09:55" },
  ]);
  const mine = tasks.filter((t) => t.assignee === "Imran Shafiq" || t.assignee === "Hamza Tariq").slice(0, 4);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setLog([{ text: note.trim(), at: new Date().toTimeString().slice(0, 5) }, ...log]);
    setNote("");
  };

  return (
    <>
      <PageHeader title="My Day" subtitle="Thursday, 22 October 2026" />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={CheckSquare} label="My tasks" value={String(mine.length)} />
        <KpiCard icon={Gauge} label="Utilization" value="68%" tone="success" />
        <KpiCard icon={Clock} label="Hours today" value="6.5 / 8" tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Attendance">
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            {checkedIn ? "You are checked in since 09:02." : "You are checked out."}
          </p>
          <button className={checkedIn ? "btn-danger w-full" : "btn-primary w-full"} onClick={() => setCheckedIn(!checkedIn)}>
            {checkedIn ? "Check out" : "Check in"}
          </button>
        </Card>

        <Card title="Today's tasks" className="lg:col-span-2">
          <ul className="divide-y divide-slate-100 text-sm">
            {mine.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy">{t.title}</span>
                  <Badge tone={statusTone(t.priority)}>{t.priority}</Badge>
                </div>
                <div className="mt-1.5"><Progress value={t.progress} label={t.title} /></div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Quick update" className="lg:col-span-3">
          <form onSubmit={submit} className="flex gap-2">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="What did you work on today?" aria-label="Daily update" />
            <button className="btn-primary" disabled={!note.trim()}>Post</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex justify-between"><span>{l.text}</span><span className="text-slate-400">{l.at}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

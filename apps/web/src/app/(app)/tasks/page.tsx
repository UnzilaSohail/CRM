"use client";

import { useState } from "react";
import { Badge, Avatar, PageHeader, Progress, statusTone } from "@/components/ui";
import { tasks as seed, type Task, type TaskStatus } from "@/lib/data";

const columns: TaskStatus[] = ["To Do", "In Progress", "Under Review", "Completed"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);

  const move = (id: string, status: TaskStatus) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, progress: status === "Completed" ? 100 : t.progress } : t)));

  return (
    <>
      <PageHeader title="Tasks" subtitle="Drag cards between columns, or use the status menu on each card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = tasks.filter((t) => t.status === col);
          return (
            <section key={col} aria-label={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragging) move(dragging, col); setDragging(null); }}
              className="min-h-40 rounded-xl bg-slate-100/70 p-3">
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-navy">
                {col}<span className="rounded-full bg-white px-2 text-xs text-slate-500">{items.length}</span>
              </h2>
              <ul className="space-y-3">
                {items.map((t) => (
                  <li key={t.id} draggable onDragStart={() => setDragging(t.id)} className="card cursor-grab p-3 active:cursor-grabbing">
                    <button className="text-left text-sm font-medium text-navy hover:underline" onClick={() => setSelected(t)}>{t.title}</button>
                    <p className="text-xs text-slate-400">{t.project}</p>
                    <div className="my-2"><Progress value={t.progress} label={`${t.title} progress`} /></div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Avatar name={t.assignee} /><Badge tone={statusTone(t.priority)}>{t.priority}</Badge></span>
                      <select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => move(t.id, e.target.value as TaskStatus)}
                        className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs">
                        {columns.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Task details">
          <button className="absolute inset-0 bg-black/40" aria-label="Close task" onClick={() => setSelected(null)} />
          <aside className="relative w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-navy">{selected.title}</h2>
            <p className="text-sm text-slate-500">{selected.project}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="text-xs text-slate-400">Assignee</dt><dd>{selected.assignee}</dd></div>
              <div><dt className="text-xs text-slate-400">Due date</dt><dd>{selected.due}</dd></div>
              <div><dt className="text-xs text-slate-400">Priority</dt><dd><Badge tone={statusTone(selected.priority)}>{selected.priority}</Badge></dd></div>
              <div><dt className="text-xs text-slate-400">Progress</dt><dd><Progress value={selected.progress} /></dd></div>
            </dl>
            <button className="btn-ghost mt-6" onClick={() => setSelected(null)}>Close</button>
          </aside>
        </div>
      )}
    </>
  );
}

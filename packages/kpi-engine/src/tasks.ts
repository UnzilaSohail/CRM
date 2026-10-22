export interface TaskLike {
  status: "open" | "in_progress" | "done" | "cancelled";
  /** ISO date (yyyy-mm-dd) in the tenant time zone. */
  dueDate: string | null;
}

/** Calendar date (yyyy-mm-dd) of an instant in an IANA time zone. */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export const isOverdue = (t: TaskLike, today: string) =>
  (t.status === "open" || t.status === "in_progress") && t.dueDate !== null && t.dueDate < today;

export function taskCounts(tasks: readonly TaskLike[], today: string) {
  const active = tasks.filter((t) => t.status !== "cancelled");
  const done = active.filter((t) => t.status === "done").length;
  return {
    total: active.length,
    done,
    overdue: active.filter((t) => isOverdue(t, today)).length,
    completionRate: active.length === 0 ? null : done / active.length,
  };
}

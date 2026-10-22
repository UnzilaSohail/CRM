import { describe, expect, it } from "vitest";
import type { Milestone } from "@crm/kpi-engine";
import { evaluateProject, type ProjectInput } from "../src/jobs/deviation-engine/evaluate.js";
import { deliverAll } from "../src/jobs/notifications/deliver.js";
import { buildSnapshot, periodStart } from "../src/jobs/kpi-snapshots/build.js";

/** One milestone planned 0 -> 100 across Jan 1-10; on Jan 8 planned is 80%. */
const ms = (percentComplete: number): Milestone => ({ weight: 1, percentComplete, plannedStart: "2026-01-01", plannedEnd: "2026-01-10" });
const project = (percentComplete: number, extra: Partial<ProjectInput> = {}): ProjectInput => ({
  id: "p1", name: "Core API", tenantId: "t1", baselineVersion: 1, milestones: [ms(percentComplete)],
  employeeIds: ["e1", "e2"], managerIds: ["m1"], ...extra,
});

describe("deviation engine (UAT: planned 80, actual 40)", () => {
  const today = "2026-01-08";

  it("raises one critical alert to employees and managers with audit and explanation", () => {
    const a = evaluateProject(project(40), today, today, new Set())!;
    expect(a.negativeDeviation).toBeCloseTo(50);
    expect(a.severity).toBe("critical");
    expect(a.recipients.sort()).toEqual(["e1", "e2", "m1"]);
    expect(a.writeAudit && a.requiresExplanation).toBe(true);
  });

  it("does not notify twice on repeated breaches in the same period", () => {
    const first = evaluateProject(project(40), today, today, new Set())!;
    expect(evaluateProject(project(40), today, today, new Set([first.dedupeKey]))).toBeNull();
  });

  it("raises again after a re-baseline (new baseline version)", () => {
    const first = evaluateProject(project(40), today, today, new Set())!;
    expect(evaluateProject(project(40, { baselineVersion: 2 }), today, today, new Set([first.dedupeKey]))).not.toBeNull();
  });

  it("watch alerts go to employees only, with no audit record", () => {
    const a = evaluateProject(project(55), today, today, new Set())!; // ~31% behind
    expect(a.severity).toBe("watch");
    expect(a.recipients).toEqual(["e1", "e2"]);
    expect(a.writeAudit).toBe(false);
  });

  it("no alert below 25% and none for a zero baseline", () => {
    expect(evaluateProject(project(70), today, today, new Set())).toBeNull();
    expect(evaluateProject(project(0), "2025-12-01", "2025-12-01", new Set())).toBeNull();
  });

  it("missing updates: progress frozen at 0 escalates as planned grows", () => {
    expect(evaluateProject(project(0), "2026-01-03", "2026-01-03", new Set())?.severity).toBe("critical");
  });
});

describe("notification delivery", () => {
  it("retries and records a failure without blocking other recipients", async () => {
    const sent: string[] = [];
    const res = await deliverAll(["e1", "bad"], "msg", async (r) => {
      if (r === "bad") throw new Error("smtp down");
      sent.push(r);
    });
    expect(sent).toEqual(["e1"]);
    expect(res.find((r) => r.recipient === "bad")).toMatchObject({ status: "failed", attempts: 3, error: "smtp down" });
    expect(res.find((r) => r.recipient === "e1")).toMatchObject({ status: "delivered", attempts: 1 });
  });

  it("succeeds on a later attempt", async () => {
    let n = 0;
    const [r] = await deliverAll(["e1"], "msg", async () => { if (++n < 2) throw new Error("blip"); });
    expect(r).toMatchObject({ status: "delivered", attempts: 2 });
  });
});

describe("snapshots", () => {
  const input = { projectId: "p1", tenantId: "t1", baselineVersion: 3, milestones: [ms(40)], tasks: [{ status: "open" as const, dueDate: "2026-01-01" }] };

  it("rolls the day over by tenant time zone", () => {
    const now = new Date("2026-01-08T21:00:00Z"); // already Jan 9 in Karachi
    expect(buildSnapshot({ ...input, timeZone: "UTC" }, "DAILY", now).periodStart).toBe("2026-01-08");
    expect(buildSnapshot({ ...input, timeZone: "Asia/Karachi" }, "DAILY", now).periodStart).toBe("2026-01-09");
  });

  it("carries baseline version and overdue counts", () => {
    const s = buildSnapshot({ ...input, timeZone: "UTC" }, "DAILY", new Date("2026-01-08T12:00:00Z"));
    expect(s).toMatchObject({ baselineVersion: 3, overdueTasks: 1, completionRate: 0 });
  });

  it("buckets weeks from Monday and months from the 1st", () => {
    expect(periodStart("2026-01-08", "WEEKLY")).toBe("2026-01-05");
    expect(periodStart("2026-01-08", "MONTHLY")).toBe("2026-01-01");
  });
});

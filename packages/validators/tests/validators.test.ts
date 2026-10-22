import { describe, expect, it } from "vitest";
import { deviationAckInput, messageInput, projectInput, taskProgressInput, thresholdsInput } from "../src/index.js";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("validators", () => {
  it("critical acknowledgement requires a cause", () => {
    expect(deviationAckInput.safeParse({ severity: "critical", cause: "" }).success).toBe(false);
    expect(deviationAckInput.safeParse({ severity: "critical", cause: "Vendor delay" }).success).toBe(true);
    expect(deviationAckInput.safeParse({ severity: "watch" }).success).toBe(true);
  });
  it("thresholds must be ordered", () => {
    expect(thresholdsInput.safeParse({ watch: 25, critical: 50 }).success).toBe(true);
    expect(thresholdsInput.safeParse({ watch: 50, critical: 25 }).success).toBe(false);
  });
  it("messages default to internal", () => {
    expect(messageInput.parse({ body: "hi" }).internal).toBe(true);
  });
  it("progress is bounded 0..100", () => {
    expect(taskProgressInput.safeParse({ percentComplete: 101 }).success).toBe(false);
    expect(taskProgressInput.safeParse({ percentComplete: 40, blocker: "Waiting on client" }).success).toBe(true);
  });
  it("rejects a project that ends before it starts", () => {
    const base = { name: "X1", customerId: uuid, milestones: [{ name: "M", weight: 100, plannedStart: "2026-01-01", plannedEnd: "2026-02-01" }] };
    expect(projectInput.safeParse({ ...base, startDate: "2026-03-01", endDate: "2026-01-01" }).success).toBe(false);
    expect(projectInput.safeParse({ ...base, startDate: "2026-01-01", endDate: "2026-03-01" }).success).toBe(true);
  });
});

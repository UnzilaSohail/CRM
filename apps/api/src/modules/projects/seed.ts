import type { Milestone } from "@crm/kpi-engine";

/** In-memory stand-in for the database until Prisma is wired in. */
export interface ProjectRecord {
  id: string;
  name: string;
  customer: string;
  manager: string;
  due: string;
  baselineVersion: number;
  /** Internal-only: never exposed through the portal module. */
  internalNotes: string;
  milestones: (Milestone & { name: string; clientVisible: boolean })[];
}

const ms = (name: string, weight: number, percentComplete: number, plannedStart: string, plannedEnd: string, clientVisible = true) =>
  ({ name, weight, percentComplete, plannedStart, plannedEnd, clientVisible });

export const projectRecords: ProjectRecord[] = [
  {
    id: "p1", name: "Core API migration", customer: "Meezan Bank", manager: "S. Khalid", due: "2026-11-24",
    baselineVersion: 1, internalNotes: "Team stretched; vendor delay on auth service.",
    milestones: [
      ms("Discovery and scoping", 20, 100, "2026-09-01", "2026-09-20"),
      ms("Environment setup", 25, 70, "2026-09-15", "2026-10-25"),
      ms("Token and auth work", 30, 20, "2026-10-10", "2026-11-10"),
      ms("Settlement endpoints", 25, 0, "2026-11-01", "2026-11-24", false),
    ],
  },
  {
    id: "p3", name: "ETL data pipeline", customer: "Amber Retail", manager: "H. Tariq", due: "2026-11-10",
    baselineVersion: 1, internalNotes: "Overrun on mapping; cost over budget.",
    milestones: [ms("Ingestion", 40, 80, "2026-09-01", "2026-10-01"), ms("Transforms", 60, 10, "2026-10-01", "2026-11-10")],
  },
];

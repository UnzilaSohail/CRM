import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd");

export const customerInput = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
});

export const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().trim().max(32).optional(),
});

export const milestoneInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    weight: z.number().positive().max(100),
    plannedStart: isoDate,
    plannedEnd: isoDate,
  })
  .refine((m) => m.plannedEnd >= m.plannedStart, { message: "End date must not be before start", path: ["plannedEnd"] });

export const projectInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    customerId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    milestones: z.array(milestoneInput).min(1),
  })
  .refine((p) => p.endDate >= p.startDate, { message: "End date must not be before start", path: ["endDate"] });

export const taskProgressInput = z.object({
  percentComplete: z.number().min(0).max(100),
  blocker: z.string().trim().max(500).optional(),
});

export const dailyActivityInput = z.object({
  accomplishments: z.string().trim().min(1).max(2000),
  blockers: z.string().trim().max(2000).optional(),
  nextSteps: z.string().trim().max(2000).optional(),
  hours: z.number().min(0).max(24),
});

export const thresholdsInput = z
  .object({ watch: z.number().positive().lt(100), critical: z.number().positive().max(100) })
  .refine((t) => t.critical > t.watch, { message: "Critical must be higher than watch", path: ["critical"] });

/** Critical deviations require an explanation (spec section 6); watch-level ones do not. */
export const deviationAckInput = z
  .object({
    severity: z.enum(["watch", "critical"]),
    cause: z.string().trim().max(1000).default(""),
    recoveryOwnerId: z.string().uuid().optional(),
  })
  .refine((a) => a.severity !== "critical" || a.cause.length > 0, {
    message: "A cause is required for critical deviations",
    path: ["cause"],
  });

export const messageInput = z.object({
  body: z.string().trim().min(1).max(4000),
  /** Defaults to internal: publication to customers must be an explicit choice. */
  internal: z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerInput>;
export type ProjectInput = z.infer<typeof projectInput>;
export type DeviationAckInput = z.infer<typeof deviationAckInput>;

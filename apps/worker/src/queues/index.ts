import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const QUEUE_NAMES = [
  'kpi-snapshots',
  'deviation-engine',
  'notifications',
  'exports',
  'reminders',
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export function createQueues(connection: Redis): Record<QueueName, Queue> {
  return Object.fromEntries(
    QUEUE_NAMES.map((n) => [
      n,
      new Queue(n, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
        },
      }),
    ]),
  ) as Record<QueueName, Queue>;
}

/** Hourly schedules; each job decides per tenant whether its local day or period has rolled over. */
export async function scheduleRecurring(queues: Record<QueueName, Queue>) {
  const q = queues['kpi-snapshots'];
  await q.upsertJobScheduler(
    'daily',
    { pattern: '0 * * * *' },
    { name: 'snapshot', data: { period: 'DAILY' } },
  );
  await q.upsertJobScheduler(
    'weekly',
    { pattern: '5 * * * *' },
    { name: 'snapshot', data: { period: 'WEEKLY' } },
  );
  await q.upsertJobScheduler(
    'monthly',
    { pattern: '10 * * * *' },
    { name: 'snapshot', data: { period: 'MONTHLY' } },
  );
}

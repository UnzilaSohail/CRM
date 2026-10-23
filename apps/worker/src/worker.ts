import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { echo, type EchoData } from './jobs/echo.js';
import { QUEUES } from './queues/names.js';

export function createSampleWorker(
  connection: Redis,
  queueName: string = QUEUES.sample,
): Worker<EchoData> {
  return new Worker<EchoData>(queueName, echo, { connection });
}

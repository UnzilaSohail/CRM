import { Worker } from 'bullmq';
import type IORedis from 'ioredis';
import { echo, type EchoData } from './jobs/echo';
import { QUEUES } from './queues/names';

export function createSampleWorker(
  connection: IORedis,
  queueName: string = QUEUES.sample,
): Worker<EchoData> {
  return new Worker<EchoData>(queueName, echo, { connection });
}

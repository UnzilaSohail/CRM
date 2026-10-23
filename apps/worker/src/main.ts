import { createConnection } from './connection.js';
import { createQueues, scheduleRecurring } from './queues/index.js';
import { createSampleWorker } from './worker.js';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createConnection(url);
const queues = createQueues(connection);
await scheduleRecurring(queues);

const worker = createSampleWorker(connection.duplicate());
worker.on('failed', (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
console.log(`worker started, redis ${url}; recurring snapshot schedules registered`);
// Real processors are attached here once the API/DB layer exists:
// snapshot -> buildSnapshot, deviation-engine -> evaluateProject, notifications -> deliverAll.

async function shutdown(): Promise<void> {
  await worker.close();
  await Promise.all(Object.values(queues).map((q) => q.close()));
  connection.disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

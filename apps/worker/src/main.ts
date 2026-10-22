import { createConnection } from './connection';
import { createSampleWorker } from './worker';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = createConnection(url);
const worker = createSampleWorker(connection);

worker.on('failed', (job, err) => console.error(`job ${job?.id} failed: ${err.message}`));
console.log(`worker started, redis ${url}`);

async function shutdown(): Promise<void> {
  await worker.close();
  connection.disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

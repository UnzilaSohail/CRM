import { Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createConnection } from '../src/connection';
import { createSampleWorker } from '../src/worker';

// Needs a real Redis (docker compose up -d redis). CI provides one and sets REDIS_URL.
const redisUrl = process.env.REDIS_URL;

describe.skipIf(!redisUrl)('sample queue (Redis)', () => {
  const name = `sample-test-${process.pid}-${Date.now()}`;
  const connection = createConnection(redisUrl ?? '');
  const queue = new Queue(name, { connection });
  const events = new QueueEvents(name, { connection: connection.duplicate() });
  const worker = createSampleWorker(connection.duplicate(), name);

  beforeAll(async () => {
    await events.waitUntilReady();
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker.close();
    await events.close();
    await queue.obliterate({ force: true });
    await queue.close();
    connection.disconnect();
  });

  it('processes a job end to end', async () => {
    const job = await queue.add('echo', { message: 'hello' });
    const result = await job.waitUntilFinished(events, 10_000);
    expect(result).toEqual({ echoed: 'hello' });
  });
});

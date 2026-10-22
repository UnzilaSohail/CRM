import IORedis from 'ioredis';

/** BullMQ workers need maxRetriesPerRequest: null. */
export function createConnection(url: string): IORedis {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

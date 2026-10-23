import { Redis } from 'ioredis';

/** BullMQ workers need maxRetriesPerRequest: null. */
export function createConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

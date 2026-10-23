import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaClient } from '@prisma/client';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../prisma/migrations');

export interface TestPrisma {
  prisma: PrismaClient;
  /** Raw PGlite handle for SQL that Prisma cannot express. */
  pg: PGlite;
  close(): Promise<void>;
}

/** In-process Postgres with every migration applied, wrapped in a real PrismaClient. No Docker needed. */
export async function createTestPrisma(): Promise<TestPrisma> {
  const pg = new PGlite({ extensions: { pg_trgm } });
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const n of names) {
    await pg.exec(readFileSync(join(migrationsDir, n, 'migration.sql'), 'utf8'));
  }
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) as never });
  return {
    prisma,
    pg,
    close: async () => {
      await prisma.$disconnect();
      await pg.close();
    },
  };
}

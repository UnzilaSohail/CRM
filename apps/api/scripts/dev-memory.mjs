// Runs the compiled API against an in-process, seeded Postgres (PGlite). No Docker, nothing persists.
// Use for local UI work and Playwright: `pnpm --filter @crm/api dev:memory` (build first).
import 'reflect-metadata';
import { createRequire } from 'node:module';
import { DEMO, demoEmail, seedDemo } from '@crm/db';
import { createTestPrisma } from '@crm/db/testing';

const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app');

// Keep the process on a development footing even if the shell exports NODE_ENV=production.
process.env.NODE_ENV = 'development';

const port = Number(process.env.PORT ?? 3001);
const db = await createTestPrisma();
await seedDemo(db.prisma);
const app = await createApp({ prisma: db.prisma });
await app.listen(port, '127.0.0.1');

console.log(`API (in-memory database) listening on http://127.0.0.1:${port}  docs: /docs`);
console.log(`Demo logins, password "${DEMO.password}":`);
for (const role of Object.keys(DEMO.users)) console.log(`  ${role.padEnd(16)} ${demoEmail(role)}`);

const stop = async () => {
  await app.close();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

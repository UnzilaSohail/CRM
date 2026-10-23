import 'reflect-metadata';
import { createApp } from './app';
import { parseEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = parseEnv();
  const app = await createApp();
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`API listening on :${env.PORT} (docs at /docs)`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

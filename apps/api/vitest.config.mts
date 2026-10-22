import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// swc (not esbuild) so Nest's emitDecoratorMetadata dependency injection works in tests.
export default defineConfig({
  plugins: [swc.vite()],
  test: { include: ['test/**/*.test.ts'] },
});

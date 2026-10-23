import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const serviceWorkerGlobals = Object.fromEntries(
  ['self', 'caches', 'fetch', 'URL', 'location'].map((g) => [g, 'readonly']),
);

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['apps/web/public/sw.js'], languageOptions: { globals: serviceWorkerGlobals } },
  { files: ['**/scripts/*.mjs'], languageOptions: { globals: { process: 'readonly' } } },
);

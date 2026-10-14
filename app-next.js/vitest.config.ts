import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the app-next.js unit-test suite.
 *
 * - jsdom environment: the contexts under test read/write `localStorage`
 *   (client-only APIs) and render React components.
 * - `test/setup.ts` registers the @testing-library/jest-dom matchers on
 *   vitest's `expect`, unmounts rendered components, and clears
 *   `localStorage` after every test so storage-seeded cases stay isolated.
 * - `test/mediaUtils.test.ts` is EXCLUDED on purpose: it is a Node-native
 *   `node --test` suite (kept runnable via `npm run test:media`); running it
 *   under vitest would fail because it registers against node:test.
 *
 * Run with `npm test` (i.e. `vitest run`).
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      // Node-native suite, not a vitest suite (see header comment).
      'test/mediaUtils.test.ts',
    ],
  },
});

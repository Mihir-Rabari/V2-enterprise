import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Global vitest setup (jsdom environment).
 *
 * 1. Registers @testing-library/jest-dom matchers on vitest's `expect`
 *    (toBeInTheDocument, toHaveValue, …).
 * 2. After every test:
 *      - unmount anything still rendered (RTL auto-cleanup relies on a
 *        global afterEach hook which is only present with `globals: true`,
 *        so we do it manually here), and
 *      - clear localStorage, since most context tests seed
 *        `v2_token` / `v2_user` / `v2_cart` and must not leak into the
 *        next test.
 */

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

/**
 * Config for the primary test entry point: `pnpm test` / `pnpm test:coverage`,
 * which run Vitest directly. This is the command the quality gate uses.
 *
 * `ng test` is a second, independent path — the `@angular/build:unit-test` builder
 * installs its own TestBed base providers, so it cannot reuse `src/test-setup.ts`
 * (doing so throws "Cannot set base providers because it has already been called").
 * Its equivalent thresholds live under the `test` target in `angular.json`; keep the
 * two in step when you change a threshold.
 */
export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/app/**/*.ts'],
      // Only test files are excluded. Application wiring (app.config.ts,
      // app.routes.ts) is covered by app.config.spec.ts instead of exempted.
      exclude: ['src/app/**/*.spec.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});

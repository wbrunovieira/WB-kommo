import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ['test/e2e/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    poolOptions: {
      threads: {
        maxThreads: 5,
      },
    },
  },
})

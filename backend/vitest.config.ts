import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './src',
    include: ['**/*.spec.ts'],
    exclude: ['**/*.e2e-spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
      },
      include: ['src/domain/**/application/**', 'src/domain/**/enterprise/**'],
      exclude: ['**/*.dto.ts', '**/*.module.ts', '**/index.ts', 'src/test/**'],
    },
  },
})

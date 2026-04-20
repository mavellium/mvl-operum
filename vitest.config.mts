import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Intercepts require('@asamuzakjp/css-color') before jsdom loads it.
    // jsdom@29 requires this ESM-only package (which has top-level await
    // via lru-cache@11), causing ERR_REQUIRE_ASYNC_MODULE in workers.
    execArgv: ['--require', resolve(__dirname, 'scripts/vitest-jsdom-patch.cjs')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', '.next', 'lib/generated'],
    },
    exclude: ['**/node_modules/**', '.next', 'notification-service/**'],
  },
})

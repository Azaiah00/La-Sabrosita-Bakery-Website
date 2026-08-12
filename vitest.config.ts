import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // The demo adapter is only legal in demo mode — `getOrderByToken`
    // now throws otherwise. Set it here so the suite does not depend on
    // how the shell happened to be invoked.
    env: { NEXT_PUBLIC_DEMO_MODE: 'true' },
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    // e2e lives in tests/e2e and runs under Playwright, not vitest.
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
  },
})

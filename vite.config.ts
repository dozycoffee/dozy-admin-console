import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'src/app/**',
        'src/pages/catalog/**',
        'src/pages/access-denied/**',
        'src/mocks/**',
        'src/**/*.test.{ts,tsx}',
        'src/vite-env.d.ts',
      ],
    },
  },
})

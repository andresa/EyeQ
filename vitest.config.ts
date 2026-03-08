import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['tests/setup.ts'],
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      globals: true,
      css: true,
      alias: {
        '@/': new URL('./src/', import.meta.url).pathname,
      },
    },
  }),
)

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    coverage: { reporter: ['text', 'json', 'html'], exclude: ['node_modules/', 'dist/'] }
  }
});

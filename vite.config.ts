import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
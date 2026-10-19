import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration tests against the TEST Supabase project (keys in .env.test.local).
Object.assign(process.env, loadEnv('test', import.meta.dirname, 'TEST_'));

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});

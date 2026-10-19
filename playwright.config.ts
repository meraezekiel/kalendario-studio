import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Set BASE_URL to test a deployed site (e.g. BASE_URL=https://kalendario-studio.vercel.app npm run e2e). */
const remote = process.env.BASE_URL;

/** Loads TEST_* vars from .env.test.local (the disposable TEST Supabase project) without overriding the shell. */
function loadTestEnv() {
  let text = '';
  try {
    text = fs.readFileSync(path.join(__dirname, '.env.test.local'), 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(TEST_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadTestEnv();

const testUrl = process.env.TEST_SUPABASE_URL;
const testAnon = process.env.TEST_SUPABASE_ANON_KEY;

/** `--project=cloud` alone needs only the cloud server (no production build on 3100). */
const projectArgs = process.argv.flatMap((a, i, all) =>
  a.startsWith('--project=') ? [a.slice(10)] : a === '--project' && all[i + 1] ? [all[i + 1]] : [],
);
const onlyCloud = projectArgs.length > 0 && projectArgs.every((p) => p === 'cloud');
const wantsCloud = projectArgs.length === 0 || projectArgs.includes('cloud');

const cloudSpecs = /cloud[\\/].*\.spec/;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: remote ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: [/mobile\.spec/, cloudSpecs] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/, testIgnore: cloudSpecs },
    // Accounts and sync against the TEST Supabase project; specs skip themselves when TEST_SUPABASE_URL is unset.
    {
      name: 'cloud',
      testMatch: cloudSpecs,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:3101' },
    },
  ],
  webServer: [
    ...(remote || onlyCloud
      ? []
      : [{ command: 'npm run start', url: 'http://localhost:3100', reuseExistingServer: true, timeout: 120_000 }]),
    // Its own dev server, pointed at the TEST project: the process env beats .env.local (the REAL project's keys).
    ...(testUrl && testAnon && wantsCloud
      ? [
          {
            command: 'npx next dev -p 3101',
            url: 'http://localhost:3101',
            reuseExistingServer: true,
            timeout: 180_000,
            env: { NEXT_PUBLIC_SUPABASE_URL: testUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: testAnon, NEXT_PUBLIC_GOOGLE_AUTH: '' },
          },
        ]
      : []),
  ],
});

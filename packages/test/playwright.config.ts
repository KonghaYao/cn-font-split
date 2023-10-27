import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Look for test files in the "tests" directory, relative to this configuration file.
    testDir: 'e2e',

    // Run all tests in parallel.
    fullyParallel: true,

    // Retry on CI only.
    retries: 2,

    // Opt out of parallel tests on CI.
    workers: 1,

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    expect: {
        toMatchSnapshot: {
            maxDiffPixels: 0,
        },
    },
});

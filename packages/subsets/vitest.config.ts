import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
    console.log(mode);
    return {
        test:
            mode === 'node'
                ? {
                      // ...
                      environment: 'node',
                      exclude: ['node_modules'],
                  }
                : mode === 'browser'
                ? {
                      globals: true,
                      browser: {
                          enabled: true,
                          name: 'chrome',
                          headless: false,
                      },
                      server: {
                          host: '0.0.0.0',
                      },
                  }
                : {},
    };
});

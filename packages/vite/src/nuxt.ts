import { addVitePlugin, defineNuxtModule } from '@nuxt/kit';

import type {} from '@nuxt/schema';

import font from './unplugin.js';

export default defineNuxtModule({
    meta: {
        configKey: 'fontSplit',
        name: 'nuxt-plugin-font',
    },
    async setup(options, nuxt) {
        // Skip when preparing
        if (nuxt.options._prepare) return;
        addVitePlugin(
            font.vite({
                ...options,
                cacheDir: 'node_modules/.vite/.font',
            }),
            {
                server: true,
                client: false,
                prepend: true,
            },
        );
        addVitePlugin(
            font.vite({
                ...options,
                cacheDir: 'node_modules/.vite/.font',
                // build 状态时，会先进行 client 的 build 导致打包失败
                server: process.env.NODE_ENV === 'production',
            }),
            {
                server: false,
                client: true,
                prepend: true,
            },
        );
    },
});

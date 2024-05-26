import { addVitePlugin, defineNuxtModule } from '@nuxt/kit';
import font from './index';

export default defineNuxtModule({
    meta: {
        configKey: 'fontSplit',
        name: 'nuxt-plugin-font',
    },
    async setup(options, nuxt) {
        // Skip when preparing
        if (nuxt.options._prepare) return;
        addVitePlugin(
            font({
                cacheDir: 'node_modules/.vite/.font',
            }),
            {
                server: true,
                client: false,
                prepend: true,
            },
        );
        addVitePlugin(
            font({
                cacheDir: 'node_modules/.vite/.font',
                server: false,
            }),
            {
                server: false,
                client: true,
                prepend: true,
            },
        );
    },
});

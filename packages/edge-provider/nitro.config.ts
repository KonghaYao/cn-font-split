//https://nitro.unjs.io/config
export default defineNitroConfig({
    srcDir: 'server',
    storage: {
        db: {
            driver: 'cloudflareKVBinding',
        },
    },
    devStorage: {
        db: {
            driver: 'fs',
            base: './.nitro/data',
        },
    },
    compatibilityDate: '2024-11-04',
});

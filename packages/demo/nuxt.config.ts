import topLevelAwait from "vite-plugin-top-level-await";
// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
    modules: [
        "@vueuse/nuxt",
        "@pinia/nuxt",
        "@nuxtjs/color-mode",
        "nuxt-headlessui",
        "nuxt-vitest",
    ],
    vite: {
        optimizeDeps: {
            exclude: ['@konghayao/cn-font-split']
        },
        plugins: [

            topLevelAwait({
                // The export name of top-level await promise for each chunk module
                promiseExportName: "__tla",
                // The function to generate import names of top-level await promise in each chunk module
                promiseImportName: (i) => `__tla_${i}`,
            }),
        ],
    },
    experimental: {
        reactivityTransform: true,
    },
    css: ["~/assets/css/tailwind.css"],
    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {},
        },
    },
    colorMode: {
        classSuffix: "",
    },
    headlessui: {
        prefix: "",
    },

    devtools: false,
});

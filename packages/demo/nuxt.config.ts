// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
    modules: [
        "@vueuse/nuxt",
        "@pinia/nuxt",
        "@nuxtjs/color-mode",
        "nuxt-headlessui",
        "nuxt-vitest",
    ],
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

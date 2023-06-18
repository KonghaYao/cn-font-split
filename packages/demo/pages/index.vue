<template>
  <div class="py-20 px-10 text-center">
    <Suspense>
      <template #fallback>
        <div class="opacity-50 italic">
          <span class="pulse">Loading...</span>
        </div>
      </template>
    </Suspense>
    <button @click="onload">开始构建</button>
  </div>
</template>
<script setup lang="ts">
const onload = async () => {
  const { fontSplit } = await import("@konghayao/cn-font-split/dist/browser/index.js");
  fontSplit({
    destFold: "./temp",
    FontPath: "./SmileySans-Oblique.ttf",
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
    async outputFile(path, buffer) {
      console.log(path);
    },
  });
};
</script>

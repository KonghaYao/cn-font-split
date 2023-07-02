<template>
  <div class="py-20 px-10 text-center">
    <Suspense>
      <template #fallback>
        <div class="opacity-50 italic">
          <span class="pulse">Loading...</span>
        </div>
      </template>
    </Suspense>
    <button @click="onclick">开始构建</button>
  </div>
</template>
<script setup lang="ts">
const onclick = async () => {
  const { fontSplit } = await import(
    "http://localhost:8000/dist/browser/index.js"
    // "https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.3.2/dist/browser/index.js"
  );
  console.log("开始");
  fontSplit({
    destFold: "./temp",
    FontPath: new URL("/SmileySans-Oblique.ttf", location.href).toString(), // 注意使用绝对路径
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    previewImage: {},
    threads: {},
    // log(...args){},
    async outputFile(path, file) {},
  });
};
</script>

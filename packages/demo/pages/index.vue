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
import { fontSplit } from "@konghayao/cn-font-split/dist/browser/index";
const onclick = async () => {
  console.log("开始");

  fontSplit({
    destFold: "./temp",
    FontPath: "/SmileySans-Oblique.ttf", // 注意使用绝对路径
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
    threads: {},
    // log(...args){},
    outputFile(path, file) {},
  });
};
</script>

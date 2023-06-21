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
import { IOutputFile } from "@konghayao/cn-font-split";
import { proxy } from "comlink";
const onclick = async () => {
  const { SplitWorkerAPI } = await import("../composables/font-split-worker/api");

  const outputFile: IOutputFile = async function (path, buffer) {
    console.log(path);
  };
  SplitWorkerAPI.fontSplit(
    {
      destFold: "./temp",
      FontPath: "/SmileySans-Oblique.ttf", // 注意使用绝对路径
      targetType: "woff2",
      // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
      // previewImage: {},
    },
    proxy(outputFile)
  );
};
</script>

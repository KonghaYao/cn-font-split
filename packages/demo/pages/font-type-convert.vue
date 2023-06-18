<template>
  <main class="py-20 px-10 text-center">
    <input type="file" name="" value="" @input="upload" accepts="font/*" />
  </main>
</template>

<script setup lang="ts">
const upload = (e) => {
  console.log(e.target.files[0]);
  //   import("@chinese-fonts/wawoff2")
};
</script>

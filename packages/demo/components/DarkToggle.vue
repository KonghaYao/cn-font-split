<script setup lang="ts">
const color = useColorMode();

function toggleDark() {
  color.preference = color.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <button
    class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200"
    @click="toggleDark()"
  >
    <span class="w-6 h-6">
      {{ color.value === "dark" ? "🌒" : "☀️" }}
    </span>
  </button>
</template>

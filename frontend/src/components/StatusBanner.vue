<template>
  <div v-if="message" class="banner" :class="type">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: "success" | "error" | "info";
  message: string;
}>();
</script>

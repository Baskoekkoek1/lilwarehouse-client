<template>
  <div class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="48" width="3" />
    <p v-if="message" class="mt-4 text-body-2 text-grey">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string;
  }>(),
  {
    message: "Fetching warehouse directory...",
  },
);
</script>

<template>
  <div class="text-center py-16 px-4">
    <v-avatar color="grey-lighten-4" size="72" class="mb-4">
      <v-icon :icon="icon" size="36" color="grey-darken-1" />
    </v-avatar>
    <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-2">
      {{ title }}
    </h3>
    <p class="text-caption text-grey mt-1">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    icon?: string;
  }>(),
  {
    title: "The warehouse is empty",
    subtitle:
      "Drag and drop files or folders anywhere on this page, or click upload above.",
    icon: "mdi-package-variant-closed",
  },
);
</script>

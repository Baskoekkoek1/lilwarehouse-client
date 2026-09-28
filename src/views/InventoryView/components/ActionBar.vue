<template>
  <header class="d-flex justify-space-between align-center mb-6">
    <div>
      <h1 class="text-h4 font-weight-bold">LilWarehouse Inventory</h1>
      <p class="text-caption text-grey">Manage and upload your files</p>
    </div>

    <div class="d-flex align-center gap-2">
      <v-btn
        variant="outlined"
        prepend-icon="mdi-folder-upload-outline"
        class="text-none font-weight-medium"
        @click="emit('upload-folder')"
      >
        Upload Folder
      </v-btn>

      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-cloud-upload-outline"
        class="text-none font-weight-medium"
        @click="emit('upload-files')"
      >
        Upload Files
      </v-btn>

      <v-btn
        color="secondary"
        variant="tonal"
        icon="mdi-refresh"
        :loading="loading"
        @click="emit('refresh')"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "upload-folder"): void;
  (e: "upload-files"): void;
  (e: "refresh"): void;
}>();
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>

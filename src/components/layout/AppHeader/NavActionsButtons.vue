<template>
  <div class="d-flex align-center ga-2 flex-shrink-0">
    <!-- Refresh Button -->
    <v-btn
      icon
      variant="text"
      density="comfortable"
      color="grey-lighten-1"
      :loading="loading"
      @click="emit('refresh')"
    >
      <v-icon icon="mdi-refresh" />
      <v-tooltip activator="parent" location="bottom">
        Refresh Inventory
      </v-tooltip>
    </v-btn>

    <!-- Upload Folder Button -->
    <v-btn
      color="grey-lighten-1"
      variant="text"
      prepend-icon="mdi-folder-upload-outline"
      class="text-none font-weight-medium"
      @click="emit('upload-folder')"
    >
      Upload Folder
    </v-btn>

    <!-- Upload Files Button -->
    <v-btn
      color="primary"
      variant="flat"
      prepend-icon="mdi-cloud-upload-outline"
      class="text-none font-weight-medium"
      @click="emit('upload-files')"
    >
      Upload Files
    </v-btn>
  </div>
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

<template>
  <v-container
    class="inventory-container relative"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <!-- Hidden File / Folder Inputs for programmatic uploads -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="d-none"
      @change="handleFileSelect"
    />
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory
      directory
      multiple
      class="d-none"
      @change="handleFileSelect"
    />

    <!-- Main Inventory Content Wrapper -->
    <InventoryCard />

    <!-- Overlays & Feedback Elements -->
    <DropZoneOverlay v-if="isDragging" :target-path="inventory.currentPath" />
    <ParsingOverlay :active="isParsing" />
    <UploadProgressDock />

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="4000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useInventoryStore } from "@/stores/inventory";
import { useUploadStore } from "@/stores/uploads";
import { useFileDrop } from "@/composables/useFileDrop";

import InventoryCard from "./components/InventoryCard.vue";
import ParsingOverlay from "./components/ParsingOverlay.vue";
import DropZoneOverlay from "@/components/upload/DropZoneOverlay.vue";
import UploadProgressDock from "@/components/upload/UploadProgressDock.vue";

const route = useRoute();
const inventory = useInventoryStore();
const uploadStore = useUploadStore();

const {
  isDragging,
  isParsing,
  showError,
  errorMessage,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  handleFileSelect,
} = useFileDrop();

watch(
  () => route.query.path,
  async (newPath) => {
    const targetPath = typeof newPath === "string" ? newPath : "/";
    inventory.currentPath = targetPath;
    await inventory.fetchCurrentDirectory();
  },
  { immediate: true },
);

onMounted(() => {
  inventory.fetchFoldersDirectory();
  inventory.clearFilesStream();
  uploadStore.initQueue();
});
</script>

<style scoped>
.inventory-container {
  max-width: 1200px;
}
</style>

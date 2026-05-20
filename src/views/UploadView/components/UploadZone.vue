<template>
  <div class="dropzone-container">
    <!-- Removed the input from inside this div -->
    <div
      class="dropzone"
      :class="{ 'is-dragging': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
      tabindex="0"
    >
      <div class="dropzone-header">
        <v-icon size="64" color="primary">mdi-cloud-upload-outline</v-icon>
        <p>Drag & Drop files or folders here or click to browse</p>
      </div>
    </div>

    <!-- Placed outside the dropzone to prevent click event bubbling loops -->
    <input
      ref="fileInput"
      type="file"
      multiple
      @change="handleFileSelect"
      class="hidden-input"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const isDragging = ref<boolean>(false);
const fileInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits<{
  (e: "files-selected", payload: { file: File; path: string }[]): void;
}>();

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const items = e.dataTransfer?.items;
  if (!items) return;

  const uploadQueue: { file: File; path: string }[] = [];

  const traverseEntries = async (entry: any, path = "") => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      uploadQueue.push({ file, path });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) =>
        reader.readEntries(resolve),
      );
      for (const childEntry of entries) {
        await traverseEntries(childEntry, `${path}${entry.name}/`);
      }
    }
  };

  const itemsArray = Array.from(items);
  const promises = [];

  for (const item of itemsArray) {
    const entry = item.webkitGetAsEntry();
    if (entry) {
      promises.push(traverseEntries(entry));
    }
  }

  await Promise.all(promises);
  emit("files-selected", uploadQueue);
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    const filesArray = Array.from(target.files).map((file) => ({
      file,
      path: "",
    }));
    emit("files-selected", filesArray);
  }
  target.value = ""; // Resets the input selection perfectly
};

const triggerFileInput = () => fileInput.value?.click();
</script>

<style scoped>
.dropzone-container {
  display: flex;
  flex-direction: column; /* Changed to handle stacking sibling input cleanly */
  justify-content: center;
  align-items: center;
  min-height: 150px;
  width: 100%;
}

.dropzone {
  border: 2px dashed #444;
  padding: 40px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
}

.dropzone-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.is-dragging {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.hidden-input {
  display: none;
}
</style>

<template>
  <div class="dropzone-container">
    <div
      class="dropzone"
      :class="{
        'is-dragging': isDragging && !isProcessing,
        'is-disabled': isProcessing,
      }"
      @dragover.prevent="handleDragOver"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
      :tabindex="isProcessing ? -1 : 0"
    >
      <div class="dropzone-header">
        <v-progress-circular
          v-if="isProcessing"
          indeterminate
          color="primary"
        />
        <template v-else>
          <v-icon size="64" color="primary">mdi-cloud-upload-outline</v-icon>
          <p>Drag & Drop files or folders here or click to browse</p>
        </template>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      :disabled="isProcessing"
      @change="handleFileSelect"
      class="hidden-input"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  isProcessing: boolean;
}>();

const isDragging = ref<boolean>(false);
const fileInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits<{
  (e: "files-selected", payload: { file: File; path: string }[]): void;
}>();

const handleDragOver = () => {
  if (props.isProcessing) return;
  isDragging.value = true;
};

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  if (props.isProcessing) return;

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
  if (props.isProcessing) return;

  const target = e.target as HTMLInputElement;
  if (target.files) {
    const filesArray = Array.from(target.files).map((file) => ({
      file,
      path: "",
    }));
    emit("files-selected", filesArray);
  }
  target.value = "";
};

const triggerFileInput = () => {
  if (props.isProcessing) return;
  fileInput.value?.click();
};
</script>

<style scoped>
.dropzone-container {
  display: flex;
  flex-direction: column;
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

.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
  border-color: #333;
}

.hidden-input {
  display: none;
}
</style>

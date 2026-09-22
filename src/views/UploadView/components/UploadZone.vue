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
          <p class="text-subtitle-1">Drag & drop files or folders here</p>

          <!-- Explicit browse buttons for native limitations -->
          <div class="browse-actions" @click.stop>
            <v-btn
              variant="outlined"
              size="small"
              color="primary"
              :disabled="isProcessing"
              @click="fileInput?.click()"
            >
              Upload Files
            </v-btn>
            <v-btn
              variant="outlined"
              size="small"
              color="primary"
              :disabled="isProcessing"
              @click="folderInput?.click()"
            >
              Upload Folder
            </v-btn>
          </div>
        </template>
      </div>
    </div>

    <!-- Hidden input for individual / multiple files -->
    <input
      ref="fileInput"
      type="file"
      multiple
      :disabled="isProcessing"
      @change="handleFileSelect"
      class="hidden-input"
    />

    <!-- Hidden input for folder upload -->
    <input
      ref="folderInput"
      type="file"
      webkitdirectory
      directory
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

const emit = defineEmits<{
  (e: "files-selected", payload: { file: File; path: string }[]): void;
}>();

const isDragging = ref<boolean>(false);
const fileInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);

const handleDragOver = () => {
  if (props.isProcessing) return;
  isDragging.value = true;
};

const readAllDirectoryEntries = (
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> => {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch || batch.length === 0) {
          resolve(entries);
        } else {
          entries.push(...batch);
          readBatch();
        }
      }, reject);
    };

    readBatch();
  });
};

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  if (props.isProcessing) return;

  const items = e.dataTransfer?.items;
  if (!items) return;

  const uploadQueue: { file: File; path: string }[] = [];

  const traverseEntries = async (entry: FileSystemEntry, path = "") => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      uploadQueue.push({ file, path });
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await readAllDirectoryEntries(dirReader);

      for (const childEntry of entries) {
        await traverseEntries(childEntry, `${path}${entry.name}/`);
      }
    }
  };

  const promises = Array.from(items)
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null)
    .map((entry) => traverseEntries(entry));

  await Promise.all(promises);
  emit("files-selected", uploadQueue);
};

const handleFileSelect = (e: Event) => {
  if (props.isProcessing) return;

  const target = e.target as HTMLInputElement;
  if (target.files) {
    const filesArray: { file: File; path: string }[] = [];

    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i];
      if (!file) continue;

      let relativePath = file.webkitRelativePath || "";
      if (relativePath.includes("/")) {
        relativePath = relativePath.substring(
          0,
          relativePath.lastIndexOf("/") + 1,
        );
      } else {
        relativePath = "";
      }

      filesArray.push({ file, path: relativePath });
    }

    emit("files-selected", filesArray);
  }
  target.value = "";
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
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
}

.dropzone-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.browse-actions {
  display: flex;
  gap: 0.75rem;
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

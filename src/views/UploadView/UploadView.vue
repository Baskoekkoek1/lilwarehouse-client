<template>
  <v-container class="upload-view-container">
    <header class="mb-8">
      <h1 class="text-h4 font-weight-bold">Data Migration Engine</h1>
      <p class="text-grey">
        Upload files directly to B2 storage. Maintain tab focus for maximum
        speed.
      </p>
    </header>

    <v-row>
      <v-col cols="12" lg="8">
        <UploadZone @files-selected="handleFilesSelected" />
      </v-col>

      <v-col cols="12" lg="4">
        <v-card :border="true" variant="outlined" class="pa-4 rounded-lg">
          <div class="text-subtitle-2 mb-4 text-uppercase text-grey">
            Migration Stats
          </div>

          <div class="d-flex justify-space-between mb-2">
            <span>Total Files:</span>
            <span class="font-weight-bold">{{ uploadStore.totalCount }}</span>
          </div>

          <v-progress-linear
            :model-value="uploadStore.overallProgress"
            color="primary"
            height="10"
            rounded
            class="mb-6"
          />

          <div class="stats-grid d-flex justify-space-between align-center">
            <div class="stat-item">
              <div class="text-caption text-grey">Processed</div>
              <div class="text-h6">{{ uploadStore.processedCount }}</div>
            </div>

            <div class="stat-item text-right">
              <div
                class="text-caption text-grey d-flex align-center justify-end gap-1"
              >
                <v-btn
                  v-if="uploadStore.errorCount > 0 && !uploadStore.isProcessing"
                  size="x-small"
                  color="error"
                  variant="text"
                  prepend-icon="mdi-refresh"
                  class="mr-1 px-1"
                  @click="uploadStore.retryFailedTasks()"
                >
                  Retry
                </v-btn>
                <span>Errors</span>
              </div>
              <div
                class="text-h6"
                :class="{ 'text-error': uploadStore.errorCount > 0 }"
              >
                {{ uploadStore.errorCount }}
              </div>
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="log-container">
            <div
              v-for="log in uploadStore.recentLogs"
              :key="log.id"
              class="log-entry"
            >
              <span class="text-grey mr-2">[{{ log.time }}]</span>
              <span
                :class="{
                  'text-success': log.type === 'success',
                  'text-error': log.type === 'error',
                  'text-primary': log.type === 'info',
                }"
              >
                {{ log.message }}
              </span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <UploadWarningModal
    v-model="showWarningModal"
    :number-of-files="numberOfFiles"
    @confirm="handleFilesUploadConfirm"
    @cancel="handleFilesUploadCancel"
  />

  <UploadSuccessModal
    v-model="showSuccessModal"
    :number-of-files="completedProcessedCount"
    :error-count="completedErrorCount"
    @goToInventory="handleGoToInventory"
    @closeModal="handleCloseModal"
  />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useUploadStore } from "@/stores/uploads";
import { useWakeLock } from "@/utils/useWakeLock";
import UploadZone from "./components/UploadZone.vue";
import UploadWarningModal from "./components/UploadWarningModal.vue";
import UploadSuccessModal from "./components/UploadSuccessModal.vue";

interface UploadFileItem {
  file: File;
  path: string;
}

const uploadStore = useUploadStore();
const { requestWakeLock, releaseWakeLock } = useWakeLock();
const router = useRouter();

const showWarningModal = ref<boolean>(false);
const showSuccessModal = ref<boolean>(false);
const numberOfFiles = ref<number>(0);
const pendingFiles = ref<UploadFileItem[]>([]);

// Snapshots to lock count values for the success modal
const completedProcessedCount = ref<number>(0);
const completedErrorCount = ref<number>(0);

const handleFilesSelected = (payload: UploadFileItem[]) => {
  pendingFiles.value = payload;

  const processableFiles = payload.filter((item) => {
    const name = item.file.name;
    return !name.startsWith(".") && name !== "Thumbs.db";
  });

  numberOfFiles.value = processableFiles.length;
  showWarningModal.value = true;
};

const handleFilesUploadConfirm = () => {
  showWarningModal.value = false;

  requestWakeLock();

  uploadStore.addUploadTasks(pendingFiles.value);
  pendingFiles.value = [];
};

const handleFilesUploadCancel = () => {
  showWarningModal.value = false;
  pendingFiles.value = [];
  numberOfFiles.value = 0;
};

const handleGoToInventory = () => {
  showSuccessModal.value = false;
  uploadStore.clearUploadQueue();
  router.push({ name: "Inventory" });
};

const handleCloseModal = () => {
  showSuccessModal.value = false;
};

watch(
  () => uploadStore.isProcessing,
  (processing) => {
    if (!processing) {
      releaseWakeLock();

      const totalEvaluated =
        uploadStore.processedCount + uploadStore.errorCount;
      if (
        uploadStore.totalCount > 0 &&
        totalEvaluated === uploadStore.totalCount
      ) {
        completedProcessedCount.value = uploadStore.processedCount;
        completedErrorCount.value = uploadStore.errorCount;

        showSuccessModal.value = true;
      }
    }
  },
);
</script>

<style scoped>
.upload-view-container {
  max-width: 1400px;
}
.log-container {
  height: 200px;
  overflow-y: auto;
  background: #000;
  padding: 8px;
  font-family: monospace;
  font-size: 0.75rem;
  border-radius: 4px;
}
.log-entry {
  margin-bottom: 4px;
  border-bottom: 1px dashed #222;
}
</style>

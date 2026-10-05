<template>
  <v-card
    v-if="uploadStore.totalCount > 0"
    class="upload-dock overflow-hidden"
    elevation="12"
    rounded="xl"
  >
    <!-- Top Progress Bar -->
    <v-progress-linear
      :model-value="uploadStore.overallProgress || 0"
      :color="uploadStore.errorCount > 0 ? 'warning' : 'primary'"
      height="4"
    />

    <!-- Header / Toggle Section -->
    <div
      class="dock-header d-flex align-center justify-space-between px-4 py-3 cursor-pointer"
      @click="toggleMinimize"
    >
      <div class="d-flex align-center ga-3 overflow-hidden">
        <v-progress-circular
          v-if="uploadStore.isProcessing"
          indeterminate
          color="primary"
          size="20"
          width="2"
        />
        <v-icon
          v-else-if="uploadStore.errorCount > 0"
          icon="mdi-alert-circle"
          color="warning"
          size="22"
        />
        <v-icon
          v-else-if="isComplete"
          icon="mdi-check-circle"
          color="success"
          size="22"
        />

        <div class="text-truncate">
          <div class="text-subtitle-2 font-weight-bold text-truncate">
            <template v-if="uploadStore.isProcessing">
              Uploading {{ uploadStore.processedCount }} of
              {{ uploadStore.totalCount }}
            </template>
            <template v-else-if="isComplete"> All uploads complete </template>
            <template v-else> Queue paused </template>
          </div>
          <div class="text-caption text-grey">
            {{ Math.round(uploadStore.overallProgress || 0) }}% completed
            <span
              v-if="uploadStore.activeProcessingCount > 0"
              class="text-primary font-weight-medium"
            >
              • {{ uploadStore.activeProcessingCount }} active
            </span>
          </div>
        </div>
      </div>

      <div class="d-flex align-center">
        <v-btn
          density="comfortable"
          variant="text"
          icon
          size="small"
          :title="isMinimized ? 'Expand' : 'Minimize'"
          @click.stop="toggleMinimize"
        >
          <v-icon :icon="isMinimized ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
        </v-btn>

        <v-btn
          v-if="!uploadStore.isProcessing"
          density="comfortable"
          variant="text"
          icon
          size="small"
          color="grey-darken-1"
          title="Clear queue"
          @click.stop="handleClearQueue"
        >
          <v-icon icon="mdi-close" />
        </v-btn>
      </div>
    </div>

    <!-- Expanded Details Section -->
    <v-expand-transition>
      <div v-show="!isMinimized" class="pa-3">
        <!-- Queue Summary Metrics -->
        <v-row
          density="compact"
          class="mb-2 text-center bg-grey-lighten-4 rounded-lg py-2 ma-0"
        >
          <v-col cols="4">
            <div class="text-caption text-grey font-weight-bold text-uppercase">
              Done
            </div>
            <div class="text-body-2 font-weight-bold">
              {{ uploadStore.processedCount }}
            </div>
          </v-col>
          <v-col cols="4">
            <div class="text-caption text-grey font-weight-bold text-uppercase">
              Active
            </div>
            <div class="text-body-2 font-weight-bold text-primary">
              {{ uploadStore.activeProcessingCount }}
            </div>
          </v-col>
          <v-col cols="4">
            <div class="text-caption text-grey font-weight-bold text-uppercase">
              Failed
            </div>
            <div
              class="text-body-2 font-weight-bold"
              :class="{ 'text-error': uploadStore.errorCount > 0 }"
            >
              {{ uploadStore.errorCount }}
            </div>
          </v-col>
        </v-row>

        <!-- Retry / Clear Failed Actions -->
        <div
          v-if="uploadStore.errorCount > 0 && !uploadStore.isProcessing"
          class="d-flex ga-2 mb-2"
        >
          <v-btn
            block
            size="small"
            color="primary"
            variant="tonal"
            class="text-none font-weight-medium flex-grow-1"
            @click="handleRetryFailed"
          >
            Retry Failed ({{ uploadStore.errorCount }})
          </v-btn>
          <v-btn
            size="small"
            color="error"
            variant="text"
            class="text-none"
            @click="handleClearFailed"
          >
            Clear
          </v-btn>
        </div>

        <!-- Activity Log Stream -->
        <div
          class="log-stream-container border rounded-lg overflow-y-auto bg-grey-lighten-5"
        >
          <div
            v-if="
              !uploadStore.recentLogs || uploadStore.recentLogs.length === 0
            "
            class="text-caption text-grey text-center py-4"
          >
            No activity logs yet
          </div>

          <template v-else>
            <div
              v-for="log in uploadStore.recentLogs"
              :key="log.id"
              class="d-flex align-center ga-2 px-3 py-2 text-caption border-b"
            >
              <span class="text-grey-darken-1 font-mono flex-shrink-0">{{
                log.time
              }}</span>
              <div
                class="flex-grow-1 text-truncate min-w-0"
                :class="getLogTextClass(log.type)"
                :title="log.message"
              >
                {{ log.message }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useUploadStore } from "@/stores/uploads";

const uploadStore = useUploadStore();
const isMinimized = ref(false);

const isComplete = computed(() => {
  return (
    !uploadStore.isProcessing &&
    uploadStore.totalCount > 0 &&
    uploadStore.processedCount + uploadStore.errorCount >=
      uploadStore.totalCount
  );
});

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function handleClearQueue() {
  uploadStore.clearUploadQueue();
}

function handleRetryFailed() {
  uploadStore.retryFailedTasks();
}

function handleClearFailed() {
  uploadStore.clearFailedTasks();
}

function getLogTextClass(type?: string) {
  switch (type) {
    case "success":
      return "text-success font-weight-bold";
    case "error":
      return "text-error font-weight-bold";
    default:
      return "text-grey-darken-3";
  }
}
</script>

<style scoped>
.upload-dock {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  width: 380px;
  max-width: calc(100vw - 48px);
}

.dock-header {
  background-color: rgba(0, 0, 0, 0.02);
  user-select: none;
}

.log-stream-container {
  max-height: 140px;
}

.font-mono {
  font-family: monospace;
  font-size: 0.75rem;
}

.min-w-0 {
  min-width: 0;
}

.cursor-pointer {
  cursor: pointer;
}
</style>

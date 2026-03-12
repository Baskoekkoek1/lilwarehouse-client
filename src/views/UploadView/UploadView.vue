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

          <div class="stats-grid">
            <div class="stat-item">
              <div class="text-caption text-grey">Processed</div>
              <div class="text-h6">{{ uploadStore.processedCount }}</div>
            </div>
            <div class="stat-item text-right">
              <div class="text-caption text-grey">Errors</div>
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
</template>

<script setup lang="ts">
import { useUploadStore } from "@/stores/uploads";
import UploadZone from "./components/UploadZone.vue";

const uploadStore = useUploadStore();

const handleFilesSelected = (payload: { file: File; path: string }[]) => {
  uploadStore.addUploadTasks(payload);
};
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

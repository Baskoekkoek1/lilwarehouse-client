<template>
  <div class="d-flex align-center justify-end ga-1">
    <!-- PENDING / QUEUED STATE -->
    <template v-if="status === 'PENDING'">
      <v-progress-circular
        indeterminate
        size="16"
        width="2"
        color="warning"
        class="mr-1"
      />
      <span class="text-caption text-warning font-weight-medium mr-1"
        >Queued</span
      >
      <v-btn
        icon
        variant="text"
        density="compact"
        class="action-btn action-btn-error"
        @click.stop="onCancel"
      >
        <v-icon icon="mdi-close-circle" />
        <v-tooltip activator="parent" location="top">Cancel</v-tooltip>
      </v-btn>
    </template>

    <!-- PROCESSING / RUNNING STATE -->
    <template v-else-if="status === 'PROCESSING' || status === 'RUNNING'">
      <div
        class="w-100 flex-grow-1 mr-1 text-left d-flex align-center ga-2"
        style="max-width: 140px"
      >
        <v-progress-linear
          v-if="!totalFiles"
          indeterminate
          color="primary"
          height="10"
          rounded
          striped
        />
        <v-progress-linear
          v-else
          :model-value="progress"
          color="primary"
          height="10"
          rounded
          striped
        >
          <template #default="{ value }">
            <strong class="text-white" style="font-size: 8px"
              >{{ value }}%</strong
            >
          </template>
        </v-progress-linear>

        <v-btn
          icon
          variant="text"
          density="compact"
          class="action-btn action-btn-error"
          @click.stop="onCancel"
        >
          <v-icon icon="mdi-close-circle" />
          <v-tooltip activator="parent" location="top">Cancel</v-tooltip>
        </v-btn>
      </div>
    </template>

    <!-- CANCELLED STATE -->
    <template v-else-if="status === 'CANCELLED'">
      <span class="text-caption text-warning font-weight-medium mr-1"
        >Cancelled</span
      >
      <v-btn
        icon
        variant="text"
        density="comfortable"
        class="action-btn action-btn-warning"
        @click.stop="emit('download')"
      >
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="top">Try Again</v-tooltip>
      </v-btn>
    </template>

    <!-- FAILED STATE -->
    <template v-else-if="status === 'FAILED'">
      <span class="text-caption text-error font-weight-medium mr-1"
        >Failed</span
      >
      <v-btn
        icon
        variant="text"
        density="comfortable"
        class="action-btn action-btn-error"
        @click.stop="emit('download')"
      >
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="top">Try Again</v-tooltip>
      </v-btn>
    </template>

    <!-- DEFAULT / IDLE / COMPLETED STATE -->
    <template v-else>
      <v-btn
        icon
        variant="text"
        density="comfortable"
        class="action-btn action-btn-primary"
        @click.stop="emit('download')"
      >
        <v-icon
          :icon="
            status === 'COMPLETED' ? 'mdi-download-box' : 'mdi-folder-download'
          "
        />
        <v-tooltip activator="parent" location="top">
          {{ status === "COMPLETED" ? "Download ZIP" : "Download Folder" }}
        </v-tooltip>
      </v-btn>
    </template>

    <!-- DELETE FOLDER BUTTON -->
    <v-btn
      icon
      variant="text"
      density="comfortable"
      class="action-btn action-btn-error"
      :disabled="isDeleting"
      @click.stop="emit('delete')"
    >
      <v-progress-circular
        v-if="isDeleting"
        indeterminate
        size="18"
        width="2"
        color="error"
      />
      <v-icon v-else icon="mdi-delete" />
      <v-tooltip activator="parent" location="top">Delete Folder</v-tooltip>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  status?: string;
  progress?: number;
  totalFiles?: number;
  jobId?: string;
  isDeleting?: boolean;
}>();

const emit = defineEmits<{
  (e: "download"): void;
  (e: "delete"): void;
  (e: "cancel", jobId: string): void;
}>();

const onCancel = () => {
  if (props.jobId) emit("cancel", props.jobId);
};
</script>

<style scoped>
.action-btn {
  color: #9ca3af !important;
  opacity: 0.6;
  transition:
    opacity 0.2s ease,
    color 0.2s ease,
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.action-btn:hover {
  opacity: 1;
  transform: scale(1.15);
}

.action-btn-primary:hover {
  color: rgb(var(--v-theme-primary)) !important;
}

.action-btn-error:hover {
  color: rgb(var(--v-theme-error)) !important;
}
</style>

<template>
  <div class="d-flex align-center justify-end ga-1">
    <v-btn
      icon
      variant="text"
      density="comfortable"
      class="action-btn action-btn-primary"
      :disabled="isDownloading || isDeleting"
      @click.stop="emit('download')"
    >
      <v-progress-circular
        v-if="isDownloading"
        indeterminate
        size="18"
        width="2"
        color="primary"
      />
      <v-icon v-else icon="mdi-download" />
      <v-tooltip activator="parent" location="top">Download File</v-tooltip>
    </v-btn>

    <v-btn
      icon
      variant="text"
      density="comfortable"
      class="action-btn action-btn-error"
      :disabled="isDownloading || isDeleting"
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
      <v-tooltip activator="parent" location="top">Delete File</v-tooltip>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDownloading: boolean;
  isDeleting: boolean;
}>();

const emit = defineEmits<{
  (e: "download"): void;
  (e: "delete"): void;
}>();
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

.action-btn-warning:hover {
  color: rgb(var(--v-theme-warning)) !important;
}
</style>
s

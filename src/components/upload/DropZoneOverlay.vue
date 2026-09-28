<template>
  <div class="dropzone-overlay">
    <v-card
      class="dropzone-card pa-8 text-center"
      elevation="12"
      rounded="xl"
      border
    >
      <div class="dropzone-icon-wrapper mb-4">
        <v-icon
          icon="mdi-cloud-upload"
          size="48"
          color="primary"
          class="bounce-icon"
        />
      </div>

      <h3 class="text-h6 font-weight-bold mb-1">Drop files to upload</h3>

      <p class="text-caption text-grey">
        Uploading directly to:
        <code class="text-primary font-weight-bold">{{
          targetPath || "/"
        }}</code>
      </p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  targetPath?: string;
}>();
</script>

<style scoped>
.dropzone-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  pointer-events: none;
}

.dropzone-card {
  max-width: 360px;
  width: 100%;
  background: rgba(255, 255, 255, 0.95) !important;
}

.dropzone-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.bounce-icon {
  animation: bounce 1.5s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>

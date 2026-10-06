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

      <p class="text-caption text-medium-emphasis mb-0">
        Uploading directly to:
        <code class="path-code text-primary font-weight-bold ml-1">{{
          formattedPath
        }}</code>
      </p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    targetPath?: string;
  }>(),
  {
    targetPath: "root",
  },
);

const formattedPath = computed(() => {
  if (!props.targetPath || props.targetPath === "root") return "/";
  return props.targetPath.startsWith("/")
    ? props.targetPath
    : `/${props.targetPath}`;
});
</script>

<style scoped>
.dropzone-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  pointer-events: none;
}

.dropzone-card {
  max-width: 360px;
  width: 100%;
  background-color: rgba(var(--v-theme-surface), 0.92) !important;
  backdrop-filter: blur(8px);
}

.dropzone-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.12);
}

.path-code {
  padding: 2px 6px;
  border-radius: 6px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-family: monospace;
}

.bounce-icon {
  animation: bounce 1.5s infinite ease-in-out;
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

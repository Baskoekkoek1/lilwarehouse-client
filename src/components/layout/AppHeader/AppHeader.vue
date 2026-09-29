<template>
  <v-app-bar flat color="surface" class="border-b px-4" height="64">
    <div
      class="d-flex justify-space-between align-center w-100 mx-auto"
      style="max-width: 1200px"
    >
      <span class="text-h6 font-weight-bold text-white flex-shrink-0">
        {{ title }}
      </span>

      <div class="d-flex align-center ga-2 flex-shrink-0">
        <v-btn
          icon
          variant="outlined"
          density="comfortable"
          color="grey-lighten-1"
          :loading="loading"
          @click="emit('refresh')"
        >
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom"
            >Refresh Inventory</v-tooltip
          >
        </v-btn>

        <v-btn
          color="grey-lighten-3"
          variant="outlined"
          prepend-icon="mdi-folder-upload-outline"
          class="text-none font-weight-medium"
          @click="emit('upload-folder')"
        >
          Upload Folder
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-cloud-upload-outline"
          class="text-none font-weight-medium"
          @click="emit('upload-files')"
        >
          Upload Files
        </v-btn>

        <v-divider vertical inset class="mx-1" />

        <!-- Auth Section -->
        <template v-if="!authStore.user && !authStore.token">
          <v-btn
            color="grey-lighten-1"
            variant="tonal"
            prepend-icon="mdi-account-box"
            class="text-none font-weight-medium"
            @click="handleAccountButtonClick"
          >
            Log In
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            icon
            variant="text"
            density="comfortable"
            @click="handleAccountButtonClick"
          >
            <v-icon icon="mdi-account-circle" color="primary" size="26" />
            <v-tooltip activator="parent" location="bottom">
              {{ authStore.user?.username || "Account" }}
            </v-tooltip>
          </v-btn>

          <v-btn
            icon
            variant="text"
            density="comfortable"
            @click="authStore.logout()"
          >
            <v-icon icon="mdi-logout" color="error" size="22" />
            <v-tooltip activator="parent" location="bottom">Log Out</v-tooltip>
          </v-btn>
        </template>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";

withDefaults(
  defineProps<{
    title?: string;
    loading?: boolean;
  }>(),
  {
    title: "LilWarehouse",
    loading: false,
  },
);

const emit = defineEmits<{
  (e: "upload-folder"): void;
  (e: "upload-files"): void;
  (e: "refresh"): void;
}>();

const uiStore = useUIStore();
const authStore = useAuthStore();

const handleAccountButtonClick = () => {
  if (!authStore.user && !authStore.token) {
    uiStore.isLoginModalOpen = true;
  }
};
</script>

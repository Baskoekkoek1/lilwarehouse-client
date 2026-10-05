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
        <!-- Refresh Button -->
        <v-btn
          icon
          variant="text"
          density="comfortable"
          color="grey-lighten-1"
          :loading="loading"
          @click="emit('refresh')"
        >
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">
            Refresh Inventory
          </v-tooltip>
        </v-btn>

        <!-- Upload Folder Button -->
        <v-btn
          color="grey-lighten-1"
          variant="text"
          prepend-icon="mdi-folder-upload-outline"
          class="text-none font-weight-medium"
          @click="emit('upload-folder')"
        >
          Upload Folder
        </v-btn>

        <!-- Upload Files Button -->
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
        <!-- Logged Out State -->
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

        <!-- Logged In Profile Dropdown Menu -->
        <template v-else>
          <v-menu location="bottom end" transition="scale-transition">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                class="d-flex align-center ga-2 text-none px-2"
              >
                <v-avatar color="grey-darken-5" size="32">
                  <v-icon icon="mdi-account" color="primary" size="20" />
                </v-avatar>
                <span
                  class="text-body-2 font-weight-medium text-grey-lighten-1"
                >
                  {{ authStore.user?.username || "Account" }}
                </span>
                <v-icon
                  icon="mdi-chevron-down"
                  size="16"
                  color="grey-lighten-1"
                />
              </v-btn>
            </template>

            <v-list
              density="compact"
              class="bg-surface border rounded-lg mt-1"
              width="180"
            >
              <v-list-item
                prepend-icon="mdi-logout"
                title="Log Out"
                color="error"
                class="text-error"
                @click="authStore.logout()"
              />
            </v-list>
          </v-menu>
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

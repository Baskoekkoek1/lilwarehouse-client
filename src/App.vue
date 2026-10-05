<template>
  <v-app>
    <AppHeader
      title="LilWarehouse"
      :loading="inventoryStore.loading"
      @refresh="inventoryStore.fetchCurrentDirectory()"
      @upload-files="triggerFileUpload"
      @upload-folder="triggerFolderUpload"
    />

    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>

    <!-- Hidden native file pickers bound programmatically via composable -->
    <input
      :ref="(el) => bindFileInput(el as HTMLInputElement)"
      type="file"
      multiple
      class="d-none"
    />
    <input
      :ref="(el) => bindFolderInput(el as HTMLInputElement)"
      type="file"
      webkitdirectory
      directory
      multiple
      class="d-none"
    />

    <!-- Global Loading Overlay -->
    <v-overlay
      v-model="uiStore.isGlobalLoading"
      class="align-center justify-center"
      persistent
      scrim="surface"
      opacity="0.8"
    >
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>

    <!-- Authentication Modal -->
    <LoginModal v-model:login-open="uiStore.isLoginModalOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/layout/AppHeader/AppHeader.vue";
import LoginModal from "./components/auth/LoginModal/LoginModal.vue";
import { useUIStore } from "./stores/ui";
import { useAuthStore } from "./stores/auth";
import { useUploadStore } from "./stores/uploads";
import { useInventoryStore } from "./stores/inventory";
import { useUploadActions } from "./composables/useUploadActions";

const uiStore = useUIStore();
const authStore = useAuthStore();
const uploadStore = useUploadStore();
const inventoryStore = useInventoryStore();

const {
  bindFileInput,
  bindFolderInput,
  triggerFileUpload,
  triggerFolderUpload,
} = useUploadActions();

onMounted(async () => {
  const isAuth = await authStore.initAuth();

  if (isAuth) {
    await uploadStore.initQueue();
  }
});
</script>

<style>
html {
  overflow-y: auto !important; /* Prevents Vuetify layout jumps */
}

.d-none {
  display: none !important;
}
</style>

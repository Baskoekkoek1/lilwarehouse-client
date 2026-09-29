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

    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="d-none"
      @change="handleFilesSelected"
    />
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory
      directory
      multiple
      class="d-none"
      @change="handleFolderSelected"
    />

    <v-overlay
      v-model="uiStore.isGlobalLoading"
      class="align-center justify-center"
      persistent
      scrim="surface"
      opacity="0.8"
    >
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>

    <LoginModal v-model:login-open="uiStore.isLoginModalOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import AppHeader from "./components/layout/AppHeader/AppHeader.vue";
import LoginModal from "./components/auth/LoginModal/LoginModal.vue";
import { useUIStore } from "./stores/ui";
import { useAuthStore } from "./stores/auth";
import { useUploadStore } from "./stores/uploads";
import { useInventoryStore } from "./stores/inventory";

const uiStore = useUIStore();
const authStore = useAuthStore();
const uploadStore = useUploadStore();
const inventoryStore = useInventoryStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const triggerFolderUpload = () => {
  folderInputRef.value?.click();
};

const handleFilesSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // Pass selected files to upload store queue
    // uploadStore.uploadFiles(Array.from(target.files));
    target.value = ""; // Reset input
  }
};

const handleFolderSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // Pass selected folder files to upload store queue
    // uploadStore.uploadFolder(Array.from(target.files));
    target.value = ""; // Reset input
  }
};

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

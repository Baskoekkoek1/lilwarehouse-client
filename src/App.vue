<template>
  <v-app>
    <nav-bar
      title="LilWarehouse"
      @open-login="uiStore.isLoginModalOpen = true"
    />

    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>

    <v-overlay
      v-model="uiStore.isGlobalLoading"
      class="align-center justify-center"
      persistent
      scrim="surface"
      opacity="0.8"
    >
    </v-overlay>

    <LoginModal v-model:login-open="uiStore.isLoginModalOpen" />
  </v-app>
</template>

<script setup lang="ts">
import NavBar from "./components/layout/NavBar/NavBar.vue";
import LoginModal from "./components/auth/LoginModal/LoginModal.vue";
// import CameraLoadingSpinner from './components/ui/CameraLoadingSpinner.vue';
import { useUIStore } from "./stores/ui";

const uiStore = useUIStore();
</script>

<style>
/* Pro-tip: Set global scrollbar styles or background logic here.
   Avoid scoped styles for v-app since it's the root.
*/
html {
  overflow-y: auto !important; /* Prevents Vuetify layout jumps */
}
</style>

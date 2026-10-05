<template>
  <div>
    <!-- Logged Out State -->
    <v-btn
      v-if="!authStore.user && !authStore.token"
      color="grey-lighten-1"
      variant="tonal"
      prepend-icon="mdi-account-box"
      class="text-none font-weight-medium"
      @click="handleAccountButtonClick"
    >
      Log In
    </v-btn>

    <!-- Logged In Profile Dropdown Menu -->
    <v-menu v-else location="bottom end" transition="scale-transition">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          variant="text"
          class="d-flex align-center ga-2 text-none px-2"
        >
          <v-avatar color="grey-darken-5" size="32">
            <v-icon icon="mdi-account" color="primary" size="20" />
          </v-avatar>
          <span class="text-body-2 font-weight-medium text-grey-lighten-1">
            {{ authStore.user?.username || "Account" }}
          </span>
          <v-icon icon="mdi-chevron-down" size="16" color="grey-lighten-1" />
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
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";

const uiStore = useUIStore();
const authStore = useAuthStore();

const handleAccountButtonClick = () => {
  if (!authStore.user && !authStore.token) {
    uiStore.isLoginModalOpen = true;
  }
};
</script>

<template>
  <v-dialog v-model="dialogVisible" persistent max-width="500">
    <v-card rounded="lg">
      <v-tabs v-model="activeTab" color="primary" grow>
        <v-tab value="login">Login</v-tab>
        <v-tab value="register">Register</v-tab>
      </v-tabs>

      <v-alert
        v-if="authStore.error"
        :text="authStore.error"
        type="error"
        variant="tonal"
        density="compact"
        class="ma-2"
        closable
      ></v-alert>

      <v-card-text class="d-flex flex-column" style="min-height: 250px">
        <div
          v-if="isTabSwitching"
          class="d-flex justify-center align-center flex-grow-1"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        </div>

        <v-window v-else v-model="activeTab" class="flex-grow-1 w-100">
          <v-window-item value="login" class="w-100">
            <login-form @success="dialogVisible = false" />
          </v-window-item>

          <v-window-item value="register" class="w-100">
            <div class="text-center pa-10">
              <v-icon size="64" icon="mdi-account-plus-outline" class="mb-4" />
              <p>Registration logic for LilWarehouse is coming soon.</p>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="dialogVisible = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "../../../stores/auth";
import LoginForm from "../LoginForm/LoginForm.vue";

const props = defineProps<{ loginOpen: boolean }>();
const emit = defineEmits(["update:loginOpen"]);

const authStore = useAuthStore();
const activeTab = ref("login");
const isTabSwitching = ref(false);

const dialogVisible = computed({
  get: () => props.loginOpen,
  set: (val) => emit("update:loginOpen", val),
});

watch(activeTab, () => {
  isTabSwitching.value = true;
  setTimeout(() => {
    isTabSwitching.value = false;
  }, 300);
});
</script>

<template>
  <v-dialog v-model="isOpen" max-width="420" persistent>
    <v-card theme="dark" class="rounded-lg border pa-2">
      <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold">
        <v-icon :icon="icon" :color="color" />
        {{ title }}
      </v-card-title>

      <v-card-text class="text-body-1 text-grey-lighten-1 py-3">
        {{ message }}
      </v-card-text>

      <v-card-actions class="justify-end ga-2 pt-2">
        <v-btn
          variant="text"
          color="grey-lighten-1"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="color"
          variant="elevated"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  color?: string;
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  title: "Confirm Action",
  message: "Are you sure you want to proceed?",
  confirmText: "Confirm",
  cancelText: "Cancel",
  color: "error",
  icon: "mdi-alert-circle-outline",
});

const isOpen = ref(false);
const loading = ref(false);

let resolvePromise: (value: boolean) => void;

const open = (): Promise<boolean> => {
  isOpen.value = true;
  loading.value = false;
  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
};

const handleConfirm = () => {
  isOpen.value = false;
  resolvePromise(true);
};

const handleCancel = () => {
  isOpen.value = false;
  resolvePromise(false);
};

// Expose open function to template refs
defineExpose({ open });
</script>

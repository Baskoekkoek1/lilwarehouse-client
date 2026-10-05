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
        <NavActionButtons
          :loading="loading"
          @refresh="emit('refresh')"
          @upload-folder="emit('upload-folder')"
          @upload-files="emit('upload-files')"
        />

        <v-divider vertical inset class="mx-1" />

        <NavUserMenu />
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
import NavActionButtons from "./NavActionsButtons.vue";
import NavUserMenu from "./NavUserMenu.vue";

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
</script>

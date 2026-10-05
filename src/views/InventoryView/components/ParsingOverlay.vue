<template>
  <v-overlay
    :model-value="active"
    class="align-center justify-center flex-column"
    persistent
  >
    <v-progress-circular indeterminate color="primary" size="64" width="4" />
    <h3 class="text-white mt-4 font-weight-bold">
      Scanning folder structure...
    </h3>
  </v-overlay>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean;
}>();
</script>

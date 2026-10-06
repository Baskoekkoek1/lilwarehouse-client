<template>
  <v-alert
    v-if="message"
    type="error"
    variant="tonal"
    class="ma-4"
    closable
    @click:close="emit('close')"
  >
    {{ message }}
  </v-alert>
</template>

<script setup lang="ts">
defineProps<{
  message?: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();
</script>

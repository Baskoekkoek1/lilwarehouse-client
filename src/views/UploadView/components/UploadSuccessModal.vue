<template>
  <v-dialog v-model="dialogVisible" persistent max-width="450">
    <v-card class="pa-4 text-center">
      <v-card-text class="pt-4">
        <v-avatar color="success" size="72" class="mb-4 elevation-2">
          <v-icon size="40" color="white" icon="mdi-check-all" />
        </v-avatar>

        <h3 class="text-h5 font-weight-bold mb-2">Migration Complete!</h3>

        <p class="text-body-1 text-grey-darken-1 mb-6">
          You have successfully migrated
          <strong>{{ props.numberOfFiles }} files</strong> to your LilWarehouse
          inventory.
        </p>

        <v-chip
          v-if="props.errorCount > 0"
          color="error"
          variant="tonal"
          prepend-icon="mdi-alert-circle"
          class="mb-4"
        >
          {{ props.errorCount }} files failed to transfer
        </v-chip>
      </v-card-text>

      <v-card-actions class="flex-column gap-2 px-4 pb-4">
        <v-btn
          color="success"
          variant="flat"
          block
          size="large"
          class="font-weight-bold"
          @click="emit('goToInventory')"
        >
          View Inventory
        </v-btn>

        <v-btn
          variant="text"
          color="grey-darken-1"
          block
          @click="emit('closeModal')"
        >
          Upload More Files
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  numberOfFiles: number;
  errorCount: number;
}>();

const dialogVisible = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: "goToInventory"): void;
  (e: "closeModal"): void;
}>();
</script>

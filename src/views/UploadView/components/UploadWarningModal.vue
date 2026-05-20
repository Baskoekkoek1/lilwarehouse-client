<template>
  <v-dialog v-model="dialogVisible" persistent max-width="500">
    <v-card class="pa-2">
      <v-card-title class="text-h5 font-weight-bold d-flex align-center gap-2">
        <v-icon color="warning" icon="mdi-alert" class="mr-2" />
        Ready to Migrate?
      </v-card-title>

      <v-card-text class="text-body-1 pt-2">
        <p class="mb-4">
          You are about to start a large-scale data migration of
          <strong>{{ props.numberOfFiles }} files</strong> to LilWarehouse. To
          ensure all files transfer successfully:
        </p>

        <v-list density="compact" class="bg-transparent pa-0 mb-4">
          <v-list-item prepend-icon="mdi-tab" class="px-0">
            <v-list-item-title class="text-wrap"
              ><strong>Keep this tab open</strong> and in
              focus.</v-list-item-title
            >
          </v-list-item>
          <v-list-item prepend-icon="mdi-power-plug" class="px-0">
            <v-list-item-title class="text-wrap"
              >Connect to a <strong>reliable power source</strong> (avoid
              battery).</v-list-item-title
            >
          </v-list-item>
          <v-list-item prepend-icon="mdi-laptop" class="px-0">
            <v-list-item-title class="text-wrap"
              ><strong>Do not close or restart</strong> your
              computer.</v-list-item-title
            >
          </v-list-item>
        </v-list>

        <v-alert
          type="info"
          variant="tonal"
          density="comfortable"
          text="We will make sure to keep your computer awake, but minimizing or switching browser tabs may pause the transfer and cause your upload to fail."
          class="text-caption"
        />
      </v-card-text>

      <v-card-actions class="justify-end pb-4 px-6">
        <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')">
          Cancel
        </v-btn>
        <v-btn
          color="green"
          variant="flat"
          class="px-4"
          @click="emit('confirm')"
        >
          Start Migration
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  numberOfFiles: number;
}>();

const dialogVisible = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
</script>

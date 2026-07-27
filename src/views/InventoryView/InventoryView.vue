<template>
  <v-container class="inventory-container">
    <header class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4 font-weight-bold">LilWarehouse Inventory</h1>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-refresh"
        :loading="inventory.loading"
        @click="handleRefresh"
      >
        Refresh
      </v-btn>
    </header>

    <BreadCrumb class="mb-4" />

    <div
      v-if="inventory.loading && inventory.items.length === 0"
      class="text-center mt-12"
    >
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-grey">Loading your files...</p>
    </div>

    <v-alert
      v-else-if="inventory.error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ inventory.error }}
    </v-alert>

    <InventoryTable v-else-if="inventory.currentDirectoryContent.length > 0" />

    <v-sheet v-else class="text-center pa-12 rounded-lg" border>
      <v-icon
        icon="mdi-package-variant-closed"
        size="64"
        color="grey-darken-1"
        class="mb-4"
      />
      <p class="text-grey">The warehouse is empty. Time to stock up!</p>
    </v-sheet>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useInventoryStore } from "@/stores/inventory";
import BreadCrumb from "./components/BreadCrumb.vue";
import InventoryTable from "./components/InventoryTable.vue";

const inventory = useInventoryStore();

const handleRefresh = async () => {
  inventory.reset();

  await Promise.all([
    inventory.fetchFoldersDirectory(),
    inventory.fetchCurrentDirectory(),
  ]);
};

onMounted(() => {
  inventory.fetchFoldersDirectory();

  inventory.clearFilesStream();
  inventory.fetchCurrentDirectory();
});
</script>

<style scoped>
.inventory-container {
  max-width: 1200px;
}
</style>

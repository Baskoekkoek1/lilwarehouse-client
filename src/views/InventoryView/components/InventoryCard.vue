<template>
  <v-card
    rounded="xl"
    border
    class="overflow-hidden d-flex flex-column justify-center"
  >
    <!-- Loading State -->
    <LoadingState v-if="inventory.loading && inventory.items.length === 0" />

    <!-- Error State -->
    <ErrorAlert
      v-else-if="inventory.error"
      :message="inventory.error"
      @close="inventory.error = null"
    />

    <!-- Main Table State -->
    <InventoryTable v-else-if="inventory.currentDirectoryContent.length > 0" />

    <!-- Empty Directory State -->
    <EmptyState v-else />
  </v-card>
</template>

<script setup lang="ts">
import { useInventoryStore } from "@/stores/inventory";
import InventoryTable from "./InventoryTable.vue";
import LoadingState from "./LoadingState.vue";
import ErrorAlert from "./ErrorAlert.vue";
import EmptyState from "./EmptyState.vue";

const inventory = useInventoryStore();
</script>

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

    <div v-else-if="inventory.currentDirectoryContent.length > 0">
      <v-table theme="dark" class="rounded-lg border">
        <thead>
          <tr>
            <th class="text-uppercase text-caption font-weight-bold">Name</th>
            <th class="text-uppercase text-caption font-weight-bold text-right">
              Size
            </th>
            <th class="text-uppercase text-caption font-weight-bold text-right">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in inventory.currentDirectoryContent"
            :key="item.id"
            class="inventory-row"
          >
            <td
              @click="handleItemClick(item)"
              :class="{ 'folder-row': item.type === 'folder' }"
              class="py-3"
            >
              <div class="d-flex align-center">
                <v-icon
                  :icon="getFileIcon(item.file_name, item.type)"
                  class="mr-3"
                  :color="item.type === 'folder' ? 'primary' : 'grey-lighten-1'"
                />
                <span class="text-truncate" style="max-width: 250px">
                  {{ item.file_name }}
                  <v-tooltip activator="parent" location="top">
                    {{ item.file_name }}
                  </v-tooltip>
                </span>
              </div>
            </td>
            <td class="text-right text-grey-lighten-1">
              {{
                item.type === "folder" ? "--" : formatBytes(item.file_size || 0)
              }}
            </td>
            <td class="text-right text-grey-lighten-1 text-caption">
              {{ formatDate(item.upload_date) }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-if="inventory.hasMoreFiles" class="d-flex justify-center mt-4">
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-chevron-double-down"
          :loading="inventory.loading"
          @click="inventory.fetchCurrentDirectory()"
        >
          Load More Files
        </v-btn>
      </div>
    </div>

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
import { formatBytes, formatDate } from "@/utils/formatters";
import { getFileIcon } from "@/utils/fileIcons";

const inventory = useInventoryStore();

const handleItemClick = (item: any) => {
  if (item.type === "folder") {
    const cleanPath =
      inventory.currentPath === "/" ? "" : inventory.currentPath;
    const newPath = cleanPath
      ? `${cleanPath}/${item.file_name}`
      : item.file_name;

    inventory.navigateTo(newPath);
  }
};

const handleRefresh = async () => {
  inventory.reset();

  await Promise.all([
    inventory.fetchFoldersDirectory(),
    inventory.fetchCurrentDirectory(),
  ]);
};

onMounted(() => {
  if (inventory.folders.length === 0) {
    inventory.fetchFoldersDirectory();
  }

  if (inventory.items.length === 0) {
    inventory.fetchCurrentDirectory();
  }
});
</script>

<style scoped>
.inventory-container {
  max-width: 1200px;
}

.inventory-row {
  transition: background-color 0.2s ease;
}

.folder-row {
  cursor: pointer;
  transition: color 0.2s ease;
}

.folder-row:hover {
  color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
</style>

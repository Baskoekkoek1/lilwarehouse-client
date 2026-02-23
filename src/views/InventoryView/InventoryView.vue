<template>
  <div class="inventory-container">
    <header>
      <h1>LilWarehouse Inventory</h1>
      <button @click="inventory.fetchInventory" :disabled="inventory.loading">
        {{ inventory.loading ? "Refreshing..." : "Refresh" }}
      </button>
    </header>

    <span v-if="inventory.loading" class="loader">Loading your files...</span>

    <span v-else-if="inventory.error" class="error">
      {{ inventory.error }}
    </span>

    <div v-else-if="inventory.currentDirectoryContent.length > 0">
      <BreadCrumb />

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in inventory.currentDirectoryContent" :key="item.id">
            <td
              @click="handleItemClick(item)"
              :class="{ 'folder-row': item.type === 'folder' }"
            >
              <span class="icon">{{
                item.type === "folder" ? "📁" : "📄"
              }}</span>
              {{ item.file_name }}
            </td>
            <td>
              {{ item.type === "folder" ? "--" : item.file_size + " bytes" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <span>The warehouse is empty. Time to stock up!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useInventoryStore } from "../../stores/inventory";
import BreadCrumb from "./components/BreadCrumb.vue";

const inventory = useInventoryStore();

/**
 * Handles virtual navigation.
 * If a folder is clicked, we append its name to the currentPath.
 */
const handleItemClick = (item: any) => {
  if (item.type === "folder") {
    // Construct the new path based on whether we are at root or not
    const cleanPath =
      inventory.currentPath === "/" ? "" : inventory.currentPath;
    const newPath = `${cleanPath}/${item.file_name}`;

    inventory.navigateTo(newPath);
  }
};

onMounted(() => {
  // Only fetch if we don't have items yet, or refresh manually
  if (inventory.items.length === 0) {
    inventory.fetchInventory();
  }
});
</script>

<style scoped>
.inventory-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th {
  text-align: left;
  border-bottom: 2px solid #444;
  padding: 12px;
  color: #888;
  text-transform: uppercase;
  font-size: 0.8rem;
}

td {
  padding: 12px;
  border-bottom: 1px solid #333;
}

.icon {
  margin-right: 8px;
  display: inline-block;
  width: 20px;
}

.folder-row {
  color: #3498db;
  cursor: pointer;
  font-weight: 600;
}

.folder-row:hover {
  background-color: rgba(52, 152, 219, 0.1);
  text-decoration: underline;
}

tr:hover:not(:has(.folder-row)) {
  background-color: #1a1a1a;
}

.loader,
.error,
.empty-state {
  display: block;
  margin-top: 40px;
  text-align: center;
  color: #888;
}

.error {
  color: #e74c3c;
}
</style>

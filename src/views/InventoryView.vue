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

    <table v-else-if="inventory.items.length > 0">
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in inventory.items" :key="item.id">
          <td>{{ item.file_name }}</td>
          <td>{{ item.file_size }} bytes</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty-state">
      <span>The warehouse is empty. Time to stock up!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useInventoryStore } from "../stores/inventory";

const inventory = useInventoryStore();

onMounted(() => {
  inventory.fetchInventory();
});
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th {
  text-align: left;
  border-bottom: 2px solid #444;
  padding: 10px;
}

td {
  padding: 10px;
  border-bottom: 1px solid #333;
}

tr:hover {
  background-color: #1a1a1a;
}
</style>

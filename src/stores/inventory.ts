import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiClient from "../api/client";

interface InventoryItem {
  id: string;
  file_name: string;
  file_size: string | number;
  status: string;
  storage_key: string;
  folder_name: string;
  b2_file_id?: string;
}

export const useInventoryStore = defineStore("inventory", () => {
  // --- State ---
  const items = ref<InventoryItem[]>([]);
  const currentPath = ref("/");
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const currentDirectoryContent = computed(() => {
    return items.value;
  });

  // --- Actions ---
  const fetchInventory = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get("/inventory");

      items.value = response.data.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to fetch inventory";
      console.error("Fetch Error:", err);
    } finally {
      loading.value = false;
    }
  };

  function setInventory(newItems: InventoryItem[]) {
    items.value = newItems;
  }

  function setError(message: string | null) {
    error.value = message;
  }

  function reset() {
    items.value = [];
    currentPath.value = "/";
    loading.value = false;
    error.value = null;
  }

  return {
    items,
    currentPath,
    loading,
    error,
    currentDirectoryContent,
    setInventory,
    fetchInventory,
    setError,
    reset,
  };
});

import { defineStore } from "pinia";
import { ref } from "vue";

export const useInventoryStore = defineStore("inventory", () => {
  // State
  const items = ref<any[]>([]);
  const currentPath = ref("/");
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  function setInventory(newItems: any[]) {
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
    setInventory,
    setError,
    reset,
  };
});

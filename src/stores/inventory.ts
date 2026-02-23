import { defineStore } from "pinia";
import { ref, computed, type ComputedRef } from "vue";
import apiClient from "../api/client";

interface InventoryItem {
  id: string;
  file_name: string;
  file_size: string | number;
  status: string;
  storage_key: string;
  folder_name: string | null | undefined;
  b2_file_id?: string;
}

interface VirtualItem {
  id: string;
  file_name: string;
  type: "file" | "folder";
  file_size?: string | number;
  status?: string;
}

export const useInventoryStore = defineStore("inventory", () => {
  // --- State ---
  const items = ref<InventoryItem[]>([]);
  const currentPath = ref("/");
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const currentDirectoryContent: ComputedRef<VirtualItem[]> = computed(() => {
    const currentPathClean = currentPath.value.replace(/^\/|\/$/g, "");

    // --- ROOT VIEW ---
    if (currentPath.value === "/") {
      const rootItems: VirtualItem[] = [];
      const foundFolders = new Set<string>();

      for (const item of items.value) {
        const raw = item.folder_name;
        if (typeof raw === "string" && raw.length > 0) {
          const parts = raw.split("/");
          const firstPart = parts[0];

          if (firstPart && !foundFolders.has(firstPart)) {
            rootItems.push({
              id: `folder-${firstPart}`,
              file_name: firstPart,
              type: "folder",
            });
            foundFolders.add(firstPart);
          }
        } else {
          rootItems.push({
            ...item,
            type: "file",
            file_name: item.file_name || "unknown",
          });
        }
      }
      return rootItems;
    }

    // --- SUBFOLDER VIEW ---
    return items.value
      .filter((item) => (item.folder_name || "") === currentPathClean)
      .map((item) => ({
        ...item,
        type: "file",
        file_name: item.file_name || "unknown",
      }));
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

  function navigateTo(path: string) {
    currentPath.value = path;
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
    navigateTo,
  };
});

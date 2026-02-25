import { defineStore } from "pinia";
import { ref, computed, type ComputedRef } from "vue";
import apiClient from "../api/client";

export interface InventoryItem {
  id: string;
  file_name: string;
  file_size: string | number;
  status: string;
  storage_key: string;
  folder_name: string | null | undefined;
  b2_file_id?: string;
  upload_date: string;
}

export interface VirtualItem {
  id: string;
  file_name: string;
  type: "file" | "folder";
  file_size?: string | number;
  status?: string;
  upload_date?: string;
}

export const useInventoryStore = defineStore("inventory", () => {
  // --- State ---
  const items = ref<InventoryItem[]>([]);
  const currentPath = ref("/");
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const currentDirectoryContent: ComputedRef<VirtualItem[]> = computed(() => {
    const foldersMap = new Map<string, VirtualItem>();
    const files: VirtualItem[] = [];

    const currentPathClean =
      currentPath.value === "/"
        ? ""
        : currentPath.value.replace(/^\/|\/$/g, "");

    for (const item of items.value) {
      const itemFolder = (item.folder_name || "").replace(/^\/|\/$/g, "");

      if (itemFolder === currentPathClean) {
        files.push({
          id: item.id,
          file_name: item.file_name,
          type: "file",
          file_size: item.file_size,
          status: item.status,
          upload_date: item.upload_date,
        });
      } else if (
        (currentPathClean === "" && itemFolder !== "") ||
        (currentPathClean !== "" &&
          itemFolder.startsWith(currentPathClean + "/"))
      ) {
        const relativePath =
          currentPathClean === ""
            ? itemFolder
            : itemFolder.slice(currentPathClean.length + 1);

        const folderName = relativePath.split("/")[0];

        if (!folderName) continue;

        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, {
            id: `folder-${folderName}`,
            file_name: folderName,
            type: "folder",
            upload_date: item.upload_date,
          });
        } else {
          const existing = foldersMap.get(folderName)!;
          if (item.upload_date > (existing.upload_date || "")) {
            existing.upload_date = item.upload_date;
          }
        }
      }
    }

    // Sort folders alphabetically
    const sortedFolders = Array.from(foldersMap.values()).sort((a, b) =>
      a.file_name.localeCompare(b.file_name),
    );

    // Return Folders first, then Files
    return [...sortedFolders, ...files];
  });

  // --- Actions ---
  const fetchInventory = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get("/inventory");
      // Expecting { data: { data: InventoryItem[] } } based on your API structure
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

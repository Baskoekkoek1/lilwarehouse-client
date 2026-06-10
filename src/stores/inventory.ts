import { defineStore } from "pinia";
import { ref, computed, type ComputedRef } from "vue";
import apiClient from "../api/client";

export interface InventoryItem {
  id: string;
  file_name: string;
  file_size: string | number;
  status: string;
  storage_key: string;
  folder_name: string;
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
  const folders = ref<string[]>([]);
  const currentPath = ref("/");
  const loading = ref(false);
  const error = ref<string | null>(null);

  const currentOffset = ref(0);
  const LIMIT = 50;
  const hasMoreFiles = ref(true);

  // --- Getters ---
  const currentDirectoryContent: ComputedRef<VirtualItem[]> = computed(() => {
    const currentPathClean =
      currentPath.value === "/"
        ? ""
        : currentPath.value.replace(/^\/|\/$/g, "");

    const targetDbFolder =
      currentPath.value === "/" ? "root" : `${currentPathClean}/`;

    const filesList: VirtualItem[] = items.value
      .filter((item) => item.folder_name === targetDbFolder)
      .map((item) => ({
        id: item.id,
        file_name: item.file_name,
        type: "file",
        file_size: item.file_size,
        status: item.status,
        upload_date: item.upload_date,
      }));

    const foldersMap = new Map<string, VirtualItem>();

    for (const folderStr of folders.value) {
      const cleanedFolder = folderStr.replace(/^\/|\/$/g, "");
      if (!cleanedFolder) continue;

      if (currentPathClean === "") {
        // At root, pick out top-level folders
        const topLevelName = cleanedFolder.split("/")[0];
        if (topLevelName && !foldersMap.has(topLevelName)) {
          foldersMap.set(topLevelName, {
            id: `folder-${topLevelName}`,
            file_name: topLevelName,
            type: "folder",
          });
        }
      } else if (cleanedFolder.startsWith(currentPathClean + "/")) {
        const relativePath = cleanedFolder.slice(currentPathClean.length + 1);
        const nextSegmentName = relativePath.split("/")[0];
        if (nextSegmentName && !foldersMap.has(nextSegmentName)) {
          foldersMap.set(nextSegmentName, {
            id: `folder-${nextSegmentName}`,
            file_name: nextSegmentName,
            type: "folder",
          });
        }
      }
    }

    const sortedFolders = Array.from(foldersMap.values()).sort((a, b) =>
      a.file_name.localeCompare(b.file_name),
    );

    return [...sortedFolders, ...filesList];
  });

  // --- Actions ---
  const fetchFoldersDirectory = async () => {
    try {
      const response = await apiClient.get("/folders");
      folders.value = Array.isArray(response.data.data)
        ? response.data.data
        : [];
    } catch (err) {
      console.error("Failed to load navigation folders directory:", err);
    }
  };

  const fetchCurrentDirectory = async () => {
    if (!hasMoreFiles.value || loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      let endpoint = "/inventory";

      const cleanFolderName = currentPath.value.replace(/^\/|\/$/g, "");

      if (cleanFolderName !== "" && currentPath.value !== "/") {
        const dbTargetFolder = `${cleanFolderName}/`;
        endpoint = `/folders/${encodeURIComponent(dbTargetFolder)}`;
      }

      const response = await apiClient.get(endpoint, {
        params: {
          limit: LIMIT,
          offset: currentOffset.value,
        },
      });

      const incomingFiles = response.data.data;

      if (Array.isArray(incomingFiles)) {
        const existingIds = new Set(items.value.map((i) => i.id));
        const uniqueIncoming = incomingFiles.filter(
          (item) => !existingIds.has(item.id),
        );

        items.value.push(...uniqueIncoming);

        if (incomingFiles.length < LIMIT) {
          hasMoreFiles.value = false;
        } else {
          currentOffset.value += LIMIT;
        }
      }
    } catch (err: any) {
      error.value =
        err.response?.data?.message || "Failed to fetch directory contents";
      console.error("Directory Fetch Error:", err);
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

  function clearFilesStream() {
    items.value = [];
    currentOffset.value = 0;
    hasMoreFiles.value = true;
  }

  function reset() {
    items.value = [];
    folders.value = [];
    currentPath.value = "/";
    loading.value = false;
    error.value = null;
    currentOffset.value = 0;
    hasMoreFiles.value = true;
  }

  function navigateTo(path: string) {
    currentPath.value = path;
    clearFilesStream();
    fetchCurrentDirectory();
  }

  return {
    items,
    folders,
    currentPath,
    loading,
    error,
    hasMoreFiles,
    currentDirectoryContent,
    setInventory,
    fetchFoldersDirectory,
    fetchCurrentDirectory,
    setError,
    clearFilesStream,
    reset,
    navigateTo,
  };
});

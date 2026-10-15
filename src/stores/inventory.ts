import { defineStore } from "pinia";
import { ref, computed, type ComputedRef } from "vue";
import axios from "axios";
import apiClient from "../api/client";
import { sanitizePath } from "@/utils/formatters";

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
  b2_file_id?: string;
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
  const downloadingFileId = ref<string | null>(null);
  const deletingFileId = ref<string | number | null>(null);
  const deletingFolderName = ref<string | null>(null);

  const currentOffset = ref(0);
  const LIMIT = 50;
  const hasMoreFiles = ref(true);

  let directoryFetchController: AbortController | null = null;

  // --- Getters ---
  const currentDirectoryContent: ComputedRef<VirtualItem[]> = computed(() => {
    const currentPathClean = sanitizePath(currentPath.value);
    const targetDbFolder = currentPathClean === "" ? "root" : currentPathClean;

    const filesList: VirtualItem[] = items.value
      .filter((item) => {
        const cleanItemFolder = sanitizePath(item.folder_name) || "root";
        return cleanItemFolder === targetDbFolder;
      })
      .map((item) => ({
        id: item.id,
        file_name: item.file_name,
        type: "file",
        file_size: item.file_size,
        b2_file_id: item.b2_file_id,
        status: item.status,
        upload_date: item.upload_date,
      }));

    const foldersMap = new Map<string, VirtualItem>();

    for (const folderStr of folders.value) {
      const cleanedFolder = sanitizePath(folderStr);
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
    } catch (err: unknown) {
      console.error("Failed to load navigation folders directory:", err);
    }
  };

  const fetchCurrentDirectory = async () => {
    if (!hasMoreFiles.value) return;

    if (directoryFetchController) {
      directoryFetchController.abort();
    }

    directoryFetchController = new AbortController();
    const currentSignal = directoryFetchController.signal;

    loading.value = true;
    error.value = null;

    try {
      let endpoint = "/inventory";
      const cleanFolderName = sanitizePath(currentPath.value);

      if (cleanFolderName !== "") {
        endpoint = `/folders/${encodeURIComponent(cleanFolderName)}`;
      }

      const response = await apiClient.get(endpoint, {
        params: {
          limit: LIMIT,
          offset: currentOffset.value,
        },
        signal: currentSignal,
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
    } catch (err: unknown) {
      if (axios.isCancel(err)) {
        return;
      }

      if (axios.isAxiosError(err)) {
        error.value =
          err.response?.data?.message || "Failed to fetch directory contents";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "An unknown error occurred while fetching the directory";
      }
      console.error("Directory Fetch Error:", err);
    } finally {
      if (!currentSignal.aborted) {
        loading.value = false;
      }
    }
  };

  const downloadFile = async (
    targetId: string | undefined,
    fallbackId?: string,
  ) => {
    // Prefer database item.id or b2_file_id over raw filename
    const downloadIdentifier = targetId || fallbackId;

    if (!downloadIdentifier) return;
    downloadingFileId.value = downloadIdentifier;

    try {
      const response = await apiClient.get(
        `/downloads/presigned/${encodeURIComponent(downloadIdentifier)}`,
      );
      const downloadUrl = response.data?.downloadUrl;
      if (!downloadUrl) {
        throw new Error(
          "Presigned download link was missing from server response.",
        );
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      console.error("File Download aborted:", err);
      if (axios.isAxiosError(err)) {
        error.value =
          err.response?.data?.message ||
          "Failed to generate file download target link.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to generate file download target link.";
      }
    } finally {
      downloadingFileId.value = null;
    }
  };

  const deleteFile = async (fileId: string | number) => {
    deletingFileId.value = fileId;
    error.value = null;
    try {
      await apiClient.delete(`/files/${fileId}`);
      items.value = items.value.filter((item) => item.id !== String(fileId));
    } catch (err: unknown) {
      console.error("File deletion error:", err);
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message || "Failed to delete file.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to delete file.";
      }
      throw err;
    } finally {
      deletingFileId.value = null;
    }
  };

  const deleteFolder = async (folderName: string): Promise<boolean> => {
    deletingFolderName.value = folderName;
    error.value = null;

    try {
      const cleanFolder = sanitizePath(folderName);
      const encodedFolder = encodeURIComponent(cleanFolder);
      const response = await apiClient.delete(`/folders/${encodedFolder}`);

      if (response.status === 200) {
        folders.value = folders.value.filter((f) => {
          const cleanF = sanitizePath(f);
          return (
            cleanF !== cleanFolder && !cleanF.startsWith(`${cleanFolder}/`)
          );
        });

        items.value = items.value.filter((item) => {
          const cleanItemFolder = sanitizePath(item.folder_name);
          return (
            cleanItemFolder !== cleanFolder &&
            !cleanItemFolder.startsWith(`${cleanFolder}/`)
          );
        });

        await fetchFoldersDirectory();
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Folder deletion error:", err);
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message || "Failed to delete folder.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to delete folder.";
      }
      return false;
    } finally {
      deletingFolderName.value = null;
    }
  };

  const setInventory = (newItems: InventoryItem[]) => {
    items.value = newItems;
  };

  const setError = (message: string | null) => {
    error.value = message;
  };

  const setCurrentPath = (path: string) => {
    currentPath.value = path;
  };

  const clearFilesStream = () => {
    items.value = [];
    currentOffset.value = 0;
    hasMoreFiles.value = true;
  };

  const reset = () => {
    items.value = [];
    folders.value = [];
    currentPath.value = "/";
    loading.value = false;
    error.value = null;
    currentOffset.value = 0;
    hasMoreFiles.value = true;
    if (directoryFetchController) {
      directoryFetchController.abort();
    }
  };

  const navigateTo = (path: string) => {
    currentPath.value = path;
    clearFilesStream();
    fetchCurrentDirectory();
  };

  return {
    items,
    folders,
    currentPath,
    loading,
    error,
    hasMoreFiles,
    currentDirectoryContent,
    downloadingFileId,
    deletingFileId,
    deletingFolderName,
    setInventory,
    fetchFoldersDirectory,
    fetchCurrentDirectory,
    setError,
    setCurrentPath,
    clearFilesStream,
    reset,
    navigateTo,
    downloadFile,
    deleteFile,
    deleteFolder,
  };
});

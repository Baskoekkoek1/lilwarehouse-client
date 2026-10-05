import { ref, onMounted, onUnmounted } from "vue";
import { useInventoryStore } from "@/stores/inventory";
import { useUploadStore } from "@/stores/uploads";

export function useFileDrop() {
  const inventory = useInventoryStore();
  const uploadStore = useUploadStore();

  const isDragging = ref(false);
  const isParsing = ref(false);
  const showError = ref(false);
  const errorMessage = ref("");

  let dragCounter = 0;

  function getBasePath(): string {
    const current = inventory.currentPath;
    if (!current || current === "root" || current === "/") return "";
    return current.replace(/^\/+|\/+$/g, "");
  }

  const preventGlobalDrop = (e: DragEvent) => e.preventDefault();

  onMounted(() => {
    window.addEventListener("dragover", preventGlobalDrop);
    window.addEventListener("drop", preventGlobalDrop);
  });

  onUnmounted(() => {
    window.removeEventListener("dragover", preventGlobalDrop);
    window.removeEventListener("drop", preventGlobalDrop);
  });

  function onDragEnter(event: DragEvent) {
    event.preventDefault();
    dragCounter++;
    if (event.dataTransfer?.types?.includes("Files")) {
      isDragging.value = true;
    }
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      isDragging.value = false;
    }
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async function parseDroppedItems(
    dataTransfer: DataTransfer,
  ): Promise<{ file: File; path: string }[]> {
    const items = Array.from(dataTransfer.items || []);
    const payload: { file: File; path: string }[] = [];
    const basePath = getBasePath();

    async function traverseEntry(entry: FileSystemEntry, relativePath: string) {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        await new Promise<void>((resolve) => {
          fileEntry.file((file) => {
            let targetPath = relativePath;
            if (basePath) {
              targetPath = targetPath ? `${basePath}/${targetPath}` : basePath;
            }
            payload.push({ file, path: targetPath || "root" });
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        const entries: FileSystemEntry[] = [];

        await new Promise<void>((resolve) => {
          const readBatch = () => {
            dirReader.readEntries((batch) => {
              if (!batch.length) {
                resolve();
              } else {
                entries.push(...batch);
                setTimeout(readBatch, 0);
              }
            });
          };
          readBatch();
        });

        const currentDirPath = relativePath
          ? `${relativePath}/${dirEntry.name}`
          : dirEntry.name;

        for (const childEntry of entries) {
          await traverseEntry(childEntry, currentDirPath);
        }
      }
    }

    const tasks: Promise<void>[] = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        tasks.push(traverseEntry(entry, ""));
      } else {
        const file = item.getAsFile();
        if (file) payload.push({ file, path: basePath || "root" });
      }
    }

    await Promise.all(tasks);
    return payload;
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    dragCounter = 0;
    isDragging.value = false;
    if (!event.dataTransfer) return;

    isParsing.value = true;
    try {
      const payloadItems = await parseDroppedItems(event.dataTransfer);
      if (payloadItems.length) {
        await uploadStore.addUploadTasks(payloadItems);
      } else {
        throw new Error("No valid files found to upload.");
      }
    } catch (err) {
      console.error("Failed to process dropped folder/files:", err);
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to read dropped files.";
      showError.value = true;
    } finally {
      isParsing.value = false;
    }
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (!files.length) return;

    isParsing.value = true;
    const basePath = getBasePath();

    try {
      const payloadItems = files.map((file) => {
        let subFolder = "";
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split("/");
          parts.pop();
          subFolder = parts.join("/");
        }

        let finalPath = basePath;
        if (subFolder) {
          finalPath = basePath ? `${basePath}/${subFolder}` : subFolder;
        } else if (!finalPath) {
          finalPath = "root";
        }

        return { file, path: finalPath };
      });

      if (payloadItems.length) {
        await uploadStore.addUploadTasks(payloadItems);
      }
    } catch (err) {
      console.error("Failed to queue selected files:", err);
      errorMessage.value = "Failed to queue selected files.";
      showError.value = true;
    } finally {
      target.value = "";
      isParsing.value = false;
    }
  }

  return {
    isDragging,
    isParsing,
    showError,
    errorMessage,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    handleFileSelect,
  };
}

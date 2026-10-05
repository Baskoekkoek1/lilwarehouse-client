import { ref } from "vue";
import { useUploadStore } from "@/stores/uploads";
import { useInventoryStore } from "@/stores/inventory";
import type { UploadPayloadItem } from "@/types/uploads";

export function useUploadActions() {
  const uploadStore = useUploadStore();
  const inventoryStore = useInventoryStore();

  const fileInputRef = ref<HTMLInputElement | null>(null);
  const folderInputRef = ref<HTMLInputElement | null>(null);

  const bindFileInput = (el: HTMLInputElement | null) => {
    if (!el) return;
    fileInputRef.value = el;
    el.onchange = handleFilesSelected;
  };

  const bindFolderInput = (el: HTMLInputElement | null) => {
    if (!el) return;
    folderInputRef.value = el;
    el.onchange = handleFolderSelected;
  };

  const triggerFileUpload = () => {
    fileInputRef.value?.click();
  };

  const triggerFolderUpload = () => {
    folderInputRef.value?.click();
  };

  const handleFilesSelected = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const currentPath = inventoryStore.currentPath || "root";
    const filesArray = Array.from(target.files);

    const payload: UploadPayloadItem[] = filesArray.map((file) => ({
      file,
      path: currentPath,
    }));

    try {
      await uploadStore.addUploadTasks(payload);
    } catch (err) {
      console.error("Failed to add files to upload queue:", err);
    } finally {
      target.value = ""; // Reset input so re-selecting the same file works
    }
  };

  const handleFolderSelected = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const currentPath = inventoryStore.currentPath || "root";
    const filesArray = Array.from(target.files);

    const payload: UploadPayloadItem[] = filesArray.map((file) => {
      // webkitRelativePath contains "FolderName/subfolder/file.ext"
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split("/");
      pathParts.pop(); // Remove file name to extract subfolder structure
      const subFolder = pathParts.join("/");

      const targetPath = subFolder
        ? `${currentPath}/${subFolder}`.replace(/\/+/g, "/")
        : currentPath;

      return {
        file,
        path: targetPath,
      };
    });

    try {
      await uploadStore.addUploadTasks(payload);
    } catch (err) {
      console.error("Failed to add folder to upload queue:", err);
    } finally {
      target.value = ""; // Reset input
    }
  };

  return {
    bindFileInput,
    bindFolderInput,
    triggerFileUpload,
    triggerFolderUpload,
    handleFilesSelected,
    handleFolderSelected,
  };
}

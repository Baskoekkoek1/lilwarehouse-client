import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios"; // Crucial: Use raw axios for the S3 PUT
import * as UPLOAD from "@/types/uploads";
import apiClient from "../api/client";

// --- INTERNAL TYPES ---
type UploadTask = UPLOAD.UploadTask;
type UploadPayloadItem = UPLOAD.UploadPayloadItem;

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

export const useUploadStore = defineStore("upload", () => {
  const uploadQueue = ref<Record<string, UploadTask>>({});
  const recentLogs = ref<LogEntry[]>([]);

  // --- GETTERS ---
  const totalCount = computed(() => Object.keys(uploadQueue.value).length);
  const processedCount = computed(
    () =>
      Object.values(uploadQueue.value).filter((t) => t.status === "SUCCESS")
        .length,
  );
  const errorCount = computed(
    () =>
      Object.values(uploadQueue.value).filter((t) => t.status === "ERROR")
        .length,
  );
  const isProcessing = computed(() =>
    Object.values(uploadQueue.value).some((t) =>
      ["GETTING_URL", "UPLOADING", "FINALIZING"].includes(t.status),
    ),
  );
  const overallProgress = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round(
      ((processedCount.value + errorCount.value) / totalCount.value) * 100,
    );
  });

  // --- LOGGING HELPER ---
  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    recentLogs.value.unshift({ id: crypto.randomUUID(), time, message, type });
    if (recentLogs.value.length > 100) recentLogs.value.pop();
  };

  // --- ACTIONS ---
  const addUploadTasks = (payloadItems: UploadPayloadItem[]) => {
    const filteredItems = payloadItems.filter((item) => {
      const name = item.file.name;
      return !name.startsWith(".") && name !== "Thumbs.db";
    });

    filteredItems.forEach((item) => {
      const id = crypto.randomUUID();
      uploadQueue.value[id] = {
        id,
        file: item.file,
        fileName: item.file.name,
        path: item.path,
        status: "PENDING",
        progress: 0,
      };
    });

    if (!isProcessing.value) processQueue();
  };

  const processQueue = async () => {
    // 1. Initial Connectivity Check
    const allPending = Object.values(uploadQueue.value).every(
      (t) => t.status === "PENDING",
    );
    if (processedCount.value === 0 && allPending && totalCount.value > 0) {
      try {
        const hello = await apiClient.get("/hello");
        addLog(`System Online: ${hello.data.message}`, "success");
      } catch (e: any) {
        addLog("Connectivity Failed: Backend unreachable.", "error");
        return;
      }
    }

    const task = Object.values(uploadQueue.value).find(
      (t) => t.status === "PENDING",
    );
    if (!task) {
      if (totalCount.value > 0 && !isProcessing.value)
        addLog("Migration batch complete.", "success");
      return;
    }

    try {
      addLog(`Initializing: ${task.fileName}`);

      // STEP 1: Handshake
      task.status = "GETTING_URL";
      const { data } = await apiClient.get("/uploads/presigned", {
        params: {
          fileName: task.fileName,
          folderName: task.path || "root",
        },
      });

      const uploadUrl = data?.credentials?.uploadUrl;
      const storageKey = data?.credentials?.storageKey;

      if (!uploadUrl) throw new Error("Backend did not return an uploadUrl.");

      // STEP 2: Binary Pipe
      task.status = "UPLOADING";
      await axios.put(uploadUrl, task.file, {
        headers: {
          "Content-Type": "application/octet-stream",
        },
        timeout: 0,
        onUploadProgress: (p) => {
          task.progress = Math.round((p.loaded / (p.total || 1)) * 100);
        },
      });

      // STEP 3: Database Finalization
      task.status = "FINALIZING";
      await apiClient.post("/uploads/complete", {
        fileName: task.fileName,
        folderPath: task.path || "root",
        storageKey: storageKey,
        mimeType: task.file.type,
      });

      task.status = "SUCCESS";
      addLog(`Success: ${task.fileName}`, "success");
    } catch (err: any) {
      task.status = "ERROR";
      task.error = err.message;
      addLog(`Error [${task.fileName}]: ${err.message}`, "error");
    } finally {
      setTimeout(processQueue, 50);
    }
  };

  return {
    uploadQueue,
    recentLogs,
    totalCount,
    processedCount,
    errorCount,
    overallProgress,
    isProcessing,
    addUploadTasks,
  };
});

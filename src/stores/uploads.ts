import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
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
  // --- STATE ---
  const uploadQueue = ref<Record<string, UploadTask>>({});
  const signatureCache = ref<
    Record<string, { uploadUrl: string; storageKey: string }>
  >({});
  const recentLogs = ref<LogEntry[]>([]);

  // --- SETTINGS ---
  const CONCURRENCY_LIMIT = 3;
  const SIGNATURE_BATCH_SIZE = 50;

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
    const totalProgress = Object.values(uploadQueue.value).reduce(
      (acc, t) => acc + (t.progress || 0),
      0,
    );
    return Math.round(totalProgress / totalCount.value);
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
    payloadItems.forEach((item) => {
      const name = item.file.name;
      if (name.startsWith(".") || name === "Thumbs.db") return;

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

    if (!isProcessing.value) startMigration();
  };

  const startMigration = async () => {
    addLog(
      `Starting migration: ${CONCURRENCY_LIMIT} concurrent streams.`,
      "info",
    );

    const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());

    try {
      await Promise.all(workers);
      addLog("All pending tasks processed.", "success");
    } catch (err: unknown) {
      addLog("The worker pool encountered a critical error.", "error");
    }
  };

  const worker = async () => {
    let task = Object.values(uploadQueue.value).find(
      (queuedTask) => queuedTask.status === "PENDING",
    );

    while (task) {
      try {
        // STEP 1: Get Signature (Batch optimized)
        task.status = "GETTING_URL";
        const creds = await getSignature(task);

        // Guard against undefined creds to satisfy TS and runtime safety
        if (!creds || !creds.uploadUrl) {
          throw new Error("Failed to retrieve a valid upload signature.");
        }

        // STEP 2: Binary Pipe (S3 PUT)
        task.status = "UPLOADING";
        await axios.put(creds.uploadUrl, task!.file, {
          headers: { "Content-Type": "application/octet-stream" },
          timeout: 0,
          onUploadProgress: (p) => {
            task!.progress = Math.round((p.loaded / (p.total || 1)) * 100);
          },
        });

        // STEP 3: Database Finalization
        task!.status = "FINALIZING";
        await apiClient.post("/uploads/complete", {
          fileName: task!.fileName,
          folderPath: task!.path || "root",
          storageKey: creds.storageKey,
          mimeType: task!.file.type,
          fileSize: task!.file.size,
        });

        task!.status = "SUCCESS";
        addLog(`Finished: ${task!.fileName}`, "success");
      } catch (err: unknown) {
        task!.status = "ERROR";
        const errorMsg =
          err instanceof Error ? err.message : "Unknown upload error";
        task!.error = errorMsg;
        addLog(`Error [${task!.fileName}]: ${errorMsg}`, "error");
      }

      task = Object.values(uploadQueue.value).find(
        (t) => t.status === "PENDING",
      );
    }
  };

  const getSignature = async (
    task: UploadTask,
  ): Promise<{ uploadUrl: string; storageKey: string } | undefined> => {
    if (signatureCache.value[task.id]) {
      const cached = signatureCache.value[task.id];
      delete signatureCache.value[task.id];
      return cached;
    }

    const pendingTasks = Object.values(uploadQueue.value)
      .filter((t) => t.status === "PENDING" || t.id === task.id)
      .slice(0, SIGNATURE_BATCH_SIZE);

    try {
      const { data } = await apiClient.post("/uploads/presigned", {
        files: pendingTasks.map((t) => ({
          fileName: t.fileName,
          folderName: t.path || "root",
        })),
      });

      if (data?.credentials && Array.isArray(data.credentials)) {
        data.credentials.forEach((cred: any, index: number) => {
          const targetTask = pendingTasks[index];
          if (targetTask) {
            signatureCache.value[targetTask.id] = {
              uploadUrl: cred.uploadUrl,
              storageKey: cred.storageKey,
            };
          }
        });
      }

      const result = signatureCache.value[task.id];
      if (result) {
        delete signatureCache.value[task.id];
      }
      return result;
    } catch (err) {
      console.error("Signature batch request failed:", err);
      return undefined;
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

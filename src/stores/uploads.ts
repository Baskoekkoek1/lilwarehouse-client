import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import * as UPLOAD from "@/types/uploads";
import apiClient from "../api/client";
import { useInventoryStore } from "./inventory";
import { uploadDb, type UploadTaskRecord } from "@/db/uploadDb";

// --- INTERNAL TYPES ---
type UploadTask = UPLOAD.UploadTask;
type UploadPayloadItem = UPLOAD.UploadPayloadItem;

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

interface CompletionBufferItem {
  taskId: string;
  fileName: string;
  folderPath: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
}

export const useUploadStore = defineStore("upload", () => {
  // --- STATE ---
  const uploadQueue = ref<Record<string, UploadTask>>({});
  const signatureCache = ref<
    Record<string, { uploadUrl: string; storageKey: string }>
  >({});
  const recentLogs = ref<LogEntry[]>([]);

  // Batching completion queue buffer
  const completionBuffer = ref<CompletionBufferItem[]>([]);
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  // Aggregate counters stored as direct reactive state
  const totalCount = ref(0);
  const processedCount = ref(0);
  const errorCount = ref(0);
  const activeProcessingCount = ref(0);

  // --- SETTINGS ---
  const CONCURRENCY_LIMIT = 3;
  const SIGNATURE_BATCH_SIZE = 50;
  const COMPLETION_BATCH_MAX_SIZE = 100;
  const COMPLETION_FLUSH_INTERVAL_MS = 3000;

  // --- GETTERS ---
  const isProcessing = computed(() => activeProcessingCount.value > 0);

  const overallProgress = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round((processedCount.value / totalCount.value) * 100);
  });

  // --- UTILITIES & HELPERS ---
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

  const syncCounts = async () => {
    totalCount.value = await uploadDb.upload_tasks.count();
    processedCount.value = await uploadDb.upload_tasks
      .where("status")
      .equals("SUCCESS")
      .count();
    errorCount.value = await uploadDb.upload_tasks
      .where("status")
      .equals("ERROR")
      .count();
    activeProcessingCount.value = await uploadDb.upload_tasks
      .where("status")
      .anyOf(["GETTING_URL", "UPLOADING", "FINALIZING"])
      .count();
  };

  // --- BATCH COMPLETION LOGIC ---
  const flushCompletionBuffer = async () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (completionBuffer.value.length === 0) return;

    const batchToFlush = [...completionBuffer.value];
    completionBuffer.value = [];

    try {
      addLog(
        `Flushing ${batchToFlush.length} upload completions to server...`,
        "info",
      );

      await apiClient.post("/uploads/complete-batch", {
        files: batchToFlush.map((item) => ({
          fileName: item.fileName,
          folderPath: item.folderPath,
          storageKey: item.storageKey,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        })),
      });

      const taskIds = batchToFlush.map((i) => i.taskId);
      await uploadDb.upload_tasks
        .where("id")
        .anyOf(taskIds)
        .modify({ status: "SUCCESS", progress: 100, updatedAt: Date.now() });

      await syncCounts();
      addLog(
        `Batch completion finalized ${batchToFlush.length} files.`,
        "success",
      );

      const inventoryStore = useInventoryStore();
      inventoryStore.clearFilesStream();
      await inventoryStore.fetchFoldersDirectory();
      await inventoryStore.fetchCurrentDirectory();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Batch completion request failed";

      addLog(`Batch completion failed: ${errorMsg}`, "error");

      const taskIds = batchToFlush.map((i) => i.taskId);
      await uploadDb.upload_tasks
        .where("id")
        .anyOf(taskIds)
        .modify({
          status: "ERROR",
          error: `Batch failed during server completion: ${errorMsg}`,
          updatedAt: Date.now(),
        });

      await syncCounts();
    }
  };

  const queueCompletionTask = async (task: CompletionBufferItem) => {
    completionBuffer.value.push(task);

    if (completionBuffer.value.length >= COMPLETION_BATCH_MAX_SIZE) {
      await flushCompletionBuffer();
      return;
    }

    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushCompletionBuffer();
    }, COMPLETION_FLUSH_INTERVAL_MS);
  };

  // --- ACTIONS ---
  const initQueue = async () => {
    const strandedCount = await uploadDb.upload_tasks
      .where("status")
      .anyOf(["GETTING_URL", "UPLOADING", "FINALIZING"])
      .modify({ status: "PENDING", error: undefined });

    if (strandedCount > 0) {
      addLog(
        `Reset ${strandedCount} interrupted tasks to pending state.`,
        "info",
      );
    }

    await syncCounts();

    const pendingCount = await uploadDb.upload_tasks
      .where("status")
      .equals("PENDING")
      .count();

    if (pendingCount > 0 && !isProcessing.value) {
      addLog(`Resuming ${pendingCount} pending uploads from database.`, "info");
      startMigration();
    }
  };

  const addUploadTasks = async (payloadItems: UploadPayloadItem[]) => {
    const now = Date.now();
    const records: UploadTaskRecord[] = [];

    payloadItems.forEach((item) => {
      const name = item.file.name;
      if (name.startsWith(".") || name === "Thumbs.db") return;

      records.push({
        id: crypto.randomUUID(),
        file: item.file,
        fileName: item.file.name,
        path: item.path,
        fileSize: item.file.size,
        mimeType: item.file.type || "application/octet-stream",
        status: "PENDING",
        progress: 0,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    });

    if (records.length > 0) {
      await uploadDb.upload_tasks.bulkAdd(records);
      await syncCounts();
    }

    if (!isProcessing.value) startMigration();
  };

  const startMigration = async () => {
    addLog(
      `Starting migration: ${CONCURRENCY_LIMIT} concurrent streams.`,
      "info",
    );

    await uploadDb.upload_tasks
      .where("status")
      .anyOf(["GETTING_URL", "UPLOADING", "FINALIZING"])
      .modify({ status: "PENDING", updatedAt: Date.now() });

    await syncCounts();

    const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());

    try {
      await Promise.all(workers);
      await flushCompletionBuffer();
      addLog("All pending tasks processed.", "success");

      await uploadDb.upload_tasks.where("status").equals("SUCCESS").delete();
      await syncCounts();
    } catch (err: unknown) {
      addLog("The worker pool encountered a critical error.", "error");
    }
  };

  const worker = async () => {
    const claimNextTask = async () => {
      return await uploadDb.transaction(
        "rw",
        uploadDb.upload_tasks,
        async () => {
          const pending = await uploadDb.upload_tasks
            .where("status")
            .equals("PENDING")
            .first();

          if (!pending) return null;

          await uploadDb.upload_tasks.update(pending.id, {
            status: "GETTING_URL",
            updatedAt: Date.now(),
          });

          return pending;
        },
      );
    };

    let taskRecord = await claimNextTask();

    while (taskRecord) {
      const task: UploadTask = {
        id: taskRecord.id,
        file: taskRecord.file,
        fileName: taskRecord.fileName,
        path: taskRecord.path,
        status: "GETTING_URL",
        progress: taskRecord.progress,
        error: taskRecord.error,
      };

      try {
        await syncCounts();

        const creds = await getSignature(task);

        if (!creds || !creds.uploadUrl) {
          throw new Error("Failed to retrieve a valid upload signature.");
        }

        task.status = "UPLOADING";
        await uploadDb.upload_tasks.update(task.id, {
          status: "UPLOADING",
          updatedAt: Date.now(),
        });
        await syncCounts();

        await axios.put(creds.uploadUrl, task.file, {
          headers: { "Content-Type": "application/octet-stream" },
          timeout: 0,
          onUploadProgress: (p) => {
            task.progress = Math.round((p.loaded / (p.total || 1)) * 100);
            uploadDb.upload_tasks.update(task.id, {
              progress: task.progress,
              updatedAt: Date.now(),
            });
          },
        });

        task.status = "FINALIZING";
        await uploadDb.upload_tasks.update(task.id, {
          status: "FINALIZING",
          updatedAt: Date.now(),
        });
        await syncCounts();

        await queueCompletionTask({
          taskId: task.id,
          fileName: task.fileName,
          folderPath: task.path || "root",
          storageKey: creds.storageKey,
          mimeType: task.file.type || "application/octet-stream",
          fileSize: task.file.size,
        });

        addLog(`Uploaded & buffered: ${task.fileName}`, "info");
      } catch (err: unknown) {
        task.status = "ERROR";
        const errorMsg =
          err instanceof Error ? err.message : "Unknown upload error";
        task.error = errorMsg;

        await uploadDb.upload_tasks.update(task.id, {
          status: "ERROR",
          error: errorMsg,
          updatedAt: Date.now(),
        });
        await syncCounts();

        addLog(`Error [${task.fileName}]: ${errorMsg}`, "error");
      }

      taskRecord = await claimNextTask();
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

    const pendingTasks = await uploadDb.upload_tasks
      .where("status")
      .anyOf(["PENDING", "GETTING_URL"])
      .limit(SIGNATURE_BATCH_SIZE)
      .toArray();

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

  const retryFailedTasks = async () => {
    addLog("Gathering failed tasks for retry...", "info");

    const retriedCount = await uploadDb.upload_tasks
      .where("status")
      .equals("ERROR")
      .modify({ status: "PENDING", progress: 0, error: undefined });

    await syncCounts();

    if (retriedCount > 0) {
      addLog(`Re-queueing ${retriedCount} failed tasks.`, "info");
      if (!isProcessing.value) {
        startMigration();
      }
    } else {
      addLog("No failed tasks found to retry.", "info");
    }
  };

  const clearUploadQueue = async () => {
    uploadQueue.value = {};
    recentLogs.value = [];
    signatureCache.value = {};
    completionBuffer.value = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await uploadDb.upload_tasks.clear();
    await syncCounts();
  };

  return {
    uploadQueue,
    recentLogs,
    totalCount,
    processedCount,
    errorCount,
    activeProcessingCount,
    isProcessing,
    overallProgress,
    initQueue,
    addUploadTasks,
    retryFailedTasks,
    clearUploadQueue,
  };
});

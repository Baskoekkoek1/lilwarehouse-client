import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import * as UPLOAD from "@/types/uploads";
import apiClient from "../api/client";
import { useInventoryStore } from "./inventory";
import { useAuthStore } from "./auth";
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useUploadStore = defineStore("upload", () => {
  // --- STATE ---
  const uploadQueue = ref<Record<string, UploadTask>>({});

  const fileMap = new Map<string, File>();

  const signatureCache = new Map<
    string,
    { uploadUrl: string; storageKey: string }
  >();

  const recentLogs = ref<LogEntry[]>([]);
  const isQueuing = ref(false);

  let inFlightSignaturePromise: Promise<void> | null = null;

  // Batching completion queue buffer
  const completionBuffer = ref<CompletionBufferItem[]>([]);
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  // Aggregate counters stored as direct reactive state
  const totalCount = ref(0);
  const processedCount = ref(0);
  const errorCount = ref(0);
  const activeProcessingCount = ref(0);

  // --- SETTINGS ---
  const CONCURRENCY_LIMIT = 6;
  const SIGNATURE_BATCH_SIZE = 50;
  const COMPLETION_BATCH_MAX_SIZE = 100;
  const COMPLETION_FLUSH_INTERVAL_MS = 3000;
  const CLAIM_BATCH_SIZE = 20;

  // --- GETTERS ---
  const isProcessing = computed(
    () => isQueuing.value || activeProcessingCount.value > 0,
  );

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

  const checkStorageQuota = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { quota, usage } = await navigator.storage.estimate();
        if (quota !== undefined && usage !== undefined) {
          const availableMB = Math.round((quota - usage) / (1024 * 1024));
          addLog(
            `Browser storage quota checked: ~${availableMB}MB available.`,
            "info",
          );

          if (quota - usage < 50 * 1024 * 1024) {
            addLog(
              "Warning: Very low browser local storage space remaining.",
              "error",
            );
          }
        }
      } catch (err) {
        // Quota estimate unavailable or restricted, proceed normally
      }
    }
  };

  const syncCounts = async () => {
    const [dbPending, errors, active] = await Promise.all([
      uploadDb.upload_tasks.where("status").equals("PENDING").count(),
      uploadDb.upload_tasks.where("status").equals("ERROR").count(),
      uploadDb.upload_tasks
        .where("status")
        .anyOf(["GETTING_URL", "UPLOADING", "FINALIZING"])
        .count(),
    ]);

    errorCount.value = errors;
    activeProcessingCount.value = active;
    totalCount.value = processedCount.value + dbPending + errors + active;
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

      // Eagerly delete finalized task records from IndexedDB
      const taskIds = batchToFlush.map((i) => i.taskId);
      await uploadDb.upload_tasks.where("id").anyOf(taskIds).delete();

      processedCount.value += batchToFlush.length;
      activeProcessingCount.value = Math.max(
        0,
        activeProcessingCount.value - batchToFlush.length,
      );

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

      errorCount.value += batchToFlush.length;
      activeProcessingCount.value = Math.max(
        0,
        activeProcessingCount.value - batchToFlush.length,
      );
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
    addLog("Preparing and indexing files...", "info");
    isQueuing.value = true;

    try {
      await checkStorageQuota();

      const now = Date.now();
      const records: UploadTaskRecord[] = [];

      payloadItems.forEach((item) => {
        const name = item.file.name;
        if (name.startsWith(".") || name === "Thumbs.db") return;

        const id = crypto.randomUUID();
        fileMap.set(id, item.file);

        records.push({
          id,
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

      const totalToQueue = records.length;
      addLog(
        `Found ${totalToQueue} valid files to index. Staging to database...`,
        "info",
      );

      if (totalToQueue > 0) {
        const BULK_CHUNK_SIZE = 1000;
        let stagedCount = 0;

        for (let i = 0; i < records.length; i += BULK_CHUNK_SIZE) {
          const chunk = records.slice(i, i + BULK_CHUNK_SIZE);
          await uploadDb.upload_tasks.bulkAdd(chunk);

          stagedCount += chunk.length;
          totalCount.value += chunk.length;

          if (stagedCount % 5000 === 0 || stagedCount === totalToQueue) {
            addLog(
              `Indexed ${stagedCount} / ${totalToQueue} files into database...`,
              "info",
            );
            await sleep(0); // Yield main thread to update UI
          }
        }
      }

      if (activeProcessingCount.value === 0) {
        startMigration();
      } else {
        isQueuing.value = false;
      }
    } catch (err) {
      isQueuing.value = false;
      throw err;
    }
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

    isQueuing.value = false;

    try {
      await Promise.all(workers);
      await flushCompletionBuffer();
      addLog("All pending tasks processed.", "success");

      await syncCounts();
    } catch (err: unknown) {
      addLog("The worker pool encountered a critical error.", "error");
    }
  };

  const worker = async () => {
    const claimTaskBatch = async (batchSize = CLAIM_BATCH_SIZE) => {
      return await uploadDb.transaction(
        "rw",
        uploadDb.upload_tasks,
        async () => {
          const pendingTasks = await uploadDb.upload_tasks
            .where("status")
            .equals("PENDING")
            .limit(batchSize)
            .toArray();

          if (pendingTasks.length === 0) return [];

          const ids = pendingTasks.map((t) => t.id);
          await uploadDb.upload_tasks
            .where("id")
            .anyOf(ids)
            .modify({ status: "GETTING_URL", updatedAt: Date.now() });

          return pendingTasks;
        },
      );
    };

    let taskQueue: UploadTaskRecord[] = await claimTaskBatch();

    while (taskQueue.length > 0) {
      const taskRecord = taskQueue.shift()!;
      activeProcessingCount.value++;

      const rawFile = fileMap.get(taskRecord.id);

      if (!rawFile) {
        activeProcessingCount.value = Math.max(
          0,
          activeProcessingCount.value - 1,
        );
        errorCount.value++;

        const missingErr =
          "File pointer lost due to page reload. Re-select files to retry.";

        await uploadDb.upload_tasks.update(taskRecord.id, {
          status: "ERROR",
          error: missingErr,
          updatedAt: Date.now(),
        });

        addLog(`Error [${taskRecord.fileName}]: ${missingErr}`, "error");

        if (taskQueue.length === 0) {
          taskQueue = await claimTaskBatch();
        }
        continue;
      }

      const task: UploadTask = {
        id: taskRecord.id,
        file: rawFile,
        fileName: taskRecord.fileName,
        path: taskRecord.path,
        status: "GETTING_URL",
        progress: taskRecord.progress,
        error: taskRecord.error,
      };

      try {
        const creds = await getSignature(task);

        if (!creds || !creds.uploadUrl) {
          throw new Error("Failed to retrieve a valid upload signature.");
        }

        task.status = "UPLOADING";
        await uploadDb.upload_tasks.update(task.id, {
          status: "UPLOADING",
          updatedAt: Date.now(),
        });

        const MAX_RETRIES = 5;
        let attempt = 0;
        let uploadSuccess = false;
        let lastError: unknown = null;

        let lastPersistedProgress = 0;
        let lastPersistedTime = 0;

        while (attempt < MAX_RETRIES && !uploadSuccess) {
          try {
            await axios.put(creds.uploadUrl, task.file, {
              headers: { "Content-Type": "application/octet-stream" },
              timeout: 0,
              onUploadProgress: (p) => {
                const currentProgress = Math.round(
                  (p.loaded / (p.total || 1)) * 100,
                );
                task.progress = currentProgress;

                const now = Date.now();
                if (
                  currentProgress === 100 ||
                  currentProgress - lastPersistedProgress >= 25 ||
                  now - lastPersistedTime > 1000
                ) {
                  lastPersistedProgress = currentProgress;
                  lastPersistedTime = now;
                  uploadDb.upload_tasks
                    .update(task.id, {
                      progress: currentProgress,
                      updatedAt: now,
                    })
                    .catch(() => {});
                }
              },
            });
            uploadSuccess = true;
          } catch (err) {
            attempt++;
            lastError = err;
            if (attempt < MAX_RETRIES) {
              const delay = Math.pow(2, attempt) * 1000;
              addLog(
                `Network glitch on ${task.fileName}. Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`,
                "info",
              );
              await sleep(delay);
            }
          }
        }

        if (!uploadSuccess) {
          throw (
            lastError ||
            new Error("Direct upload failed after maximum retries.")
          );
        }

        task.status = "FINALIZING";
        await uploadDb.upload_tasks.update(task.id, {
          status: "FINALIZING",
          progress: 100,
          updatedAt: Date.now(),
        });

        await queueCompletionTask({
          taskId: task.id,
          fileName: task.fileName,
          folderPath: task.path || "root",
          storageKey: creds.storageKey,
          mimeType: task.file.type || "application/octet-stream",
          fileSize: task.file.size,
        });

        // Purge raw file handle from memory as soon as upload succeeds
        fileMap.delete(task.id);
        addLog(`Uploaded & buffered: ${task.fileName}`, "info");
      } catch (err: unknown) {
        activeProcessingCount.value = Math.max(
          0,
          activeProcessingCount.value - 1,
        );
        errorCount.value++;

        task.status = "ERROR";
        const errorMsg =
          err instanceof Error ? err.message : "Unknown upload error";
        task.error = errorMsg;

        await uploadDb.upload_tasks.update(task.id, {
          status: "ERROR",
          error: errorMsg,
          updatedAt: Date.now(),
        });

        addLog(`Error [${task.fileName}]: ${errorMsg}`, "error");
      }

      if (taskQueue.length === 0) {
        taskQueue = await claimTaskBatch();
      }
    }
  };

  const getSignature = async (
    task: UploadTask,
  ): Promise<{ uploadUrl: string; storageKey: string } | undefined> => {
    if (signatureCache.has(task.id)) {
      const cached = signatureCache.get(task.id);
      signatureCache.delete(task.id);
      return cached;
    }

    if (inFlightSignaturePromise) {
      await inFlightSignaturePromise;
      if (signatureCache.has(task.id)) {
        const cached = signatureCache.get(task.id);
        signatureCache.delete(task.id);
        return cached;
      }
    }

    inFlightSignaturePromise = (async () => {
      try {
        const authStore = useAuthStore();
        await authStore.checkAndRefreshTokenIfNeeded();

        const uncachedPendingTasks = (
          await uploadDb.upload_tasks
            .where("status")
            .anyOf(["PENDING", "GETTING_URL"])
            .limit(SIGNATURE_BATCH_SIZE)
            .toArray()
        ).filter((t) => !signatureCache.has(t.id));

        if (uncachedPendingTasks.length === 0) return;

        addLog(
          `Fetching presigned URLs for batch of ${uncachedPendingTasks.length} files...`,
          "info",
        );

        const { data } = await apiClient.post("/uploads/presigned", {
          files: uncachedPendingTasks.map((t) => ({
            fileName: t.fileName,
            folderName: t.path || "root",
          })),
        });

        if (data?.credentials && Array.isArray(data.credentials)) {
          data.credentials.forEach((cred: any, index: number) => {
            const targetTask = uncachedPendingTasks[index];
            if (targetTask && cred.uploadUrl) {
              signatureCache.set(targetTask.id, {
                uploadUrl: cred.uploadUrl,
                storageKey: cred.storageKey,
              });
            }
          });
        }
      } catch (err) {
        addLog("Failed to fetch presigned URL batch.", "error");
        console.error("Signature batch request failed:", err);
      } finally {
        inFlightSignaturePromise = null;
      }
    })();

    await inFlightSignaturePromise;

    const result = signatureCache.get(task.id);
    if (result) {
      signatureCache.delete(task.id);
    }
    return result;
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

  const clearFailedTasks = async () => {
    addLog("Clearing failed tasks...", "info");

    const deletedCount = await uploadDb.upload_tasks
      .where("status")
      .equals("ERROR")
      .delete();

    await syncCounts();

    if (deletedCount > 0) {
      addLog(`Cleared ${deletedCount} failed tasks.`, "info");
    } else {
      addLog("No failed tasks found to clear.", "info");
    }
  };

  const clearUploadQueue = async () => {
    uploadQueue.value = {};
    recentLogs.value = [];
    signatureCache.clear();
    fileMap.clear();
    completionBuffer.value = [];
    processedCount.value = 0;
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
    clearFailedTasks,
    clearUploadQueue,
  };
});

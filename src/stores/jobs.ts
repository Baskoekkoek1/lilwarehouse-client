import apiClient from "@/api/client";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface Job {
  id: string;
  folder_name: string;
  status:
    | "PENDING"
    | "RUNNING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  created_at: string;
  total_files?: number;
  processed_files?: number;
}

export const useJobsStore = defineStore("jobs", () => {
  // State
  const activeJobs = ref<Job[]>([]);
  const loading = ref(false);
  const isPolling = ref(false);
  const error = ref<string | null>(null);

  let pollingIntervalId: ReturnType<typeof setInterval> | null = null;

  // Helpers

  const isJobExpired = (job: Job): boolean => {
    const createdAt = new Date(job.created_at);
    const now = new Date();
    const diffInHours =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffInHours > 24 * 3;
  };

  // Actions
  const addJob = (job: Job): void => {
    activeJobs.value = activeJobs.value.filter(
      (j) => j.folder_name !== job.folder_name && j.id !== job.id,
    );
    activeJobs.value.unshift(job);
  };

  const updateJobFromPoll = (freshJob: Job): void => {
    const index = activeJobs.value.findIndex((j) => j.id === freshJob.id);
    if (index !== -1) {
      activeJobs.value[index] = {
        ...activeJobs.value[index],
        ...freshJob,
      };
    }
  };

  const updateJobStatus = (jobId: string, status: Job["status"]): void => {
    const job = activeJobs.value.find((j) => j.id === jobId);
    if (job) {
      job.status = status;
    }
  };

  const setJobs = (jobs: Job[]): void => {
    activeJobs.value = jobs;
  };

  const setPolling = (state: boolean): void => {
    isPolling.value = state;
  };

  const setError = (message: string | null): void => {
    error.value = message;
  };

  const downloadFolder = async (folderName: string) => {
    loading.value = true;
    error.value = null;

    try {
      const sanitizedFolder = folderName.trim().replace(/\/+$/, "");

      const response = await apiClient.post("/folders/zip-request", {
        folder_name: sanitizedFolder,
      });

      const { jobId, status } = response.data;

      const newJob: Job = {
        id: jobId,
        folder_name: sanitizedFolder,
        status,
        created_at: new Date().toISOString(),
      };

      addJob(newJob);
      startPollingForJobs();
    } catch (err: any) {
      console.error("Folder packing serialization setup failed:", err);
      error.value =
        err.response?.data?.message ||
        "Failed to initiate folder compression task.";
    } finally {
      loading.value = false;
    }
  };

  const cancelJob = async (jobId: string) => {
    error.value = null;

    try {
      await apiClient.delete(`/jobs/${jobId}`);

      activeJobs.value = activeJobs.value.filter((j) => j.id !== jobId);

      const remainingUnfinishedJobs = activeJobs.value.filter(
        (j) =>
          j.status === "PENDING" ||
          j.status === "RUNNING" ||
          j.status === "PROCESSING",
      );

      if (remainingUnfinishedJobs.length === 0) {
        stopPolling();
      }
    } catch (err: any) {
      console.error(`Failed to terminate job ${jobId}:`, err);
      error.value =
        err.response?.data?.message ||
        "Failed to cancel the active download job.";
    }
  };

  const fetchRecentJobs = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get("/jobs");
      const rawJobs =
        response.data?.data?.filter((job: Job) => !isJobExpired(job)) || [];

      const deduplicatedJobs: Job[] = [];
      const seenFolders = new Set<string>();

      for (const job of rawJobs) {
        if (!seenFolders.has(job.folder_name)) {
          seenFolders.add(job.folder_name);
          deduplicatedJobs.push(job);
        }
      }

      setJobs(deduplicatedJobs);

      const runningJobs = deduplicatedJobs.filter(
        (job: Job) =>
          job.status === "PENDING" ||
          job.status === "RUNNING" ||
          job.status === "PROCESSING",
      );

      if (runningJobs.length > 0) {
        startPollingForJobs();
      }
    } catch (err: any) {
      console.error("Failed to fetch recent jobs:", err);
      error.value =
        err.response?.data?.message || "Failed to fetch recent jobs.";
    } finally {
      loading.value = false;
    }
  };

  const startPollingForJobs = () => {
    if (isPolling.value || pollingIntervalId) return;

    setPolling(true);

    pollingIntervalId = setInterval(async () => {
      const unfinishedJobs = activeJobs.value.filter(
        (j) =>
          j.status === "PENDING" ||
          j.status === "RUNNING" ||
          j.status === "PROCESSING",
      );

      if (unfinishedJobs.length === 0) {
        stopPolling();
        return;
      }

      await Promise.all(
        unfinishedJobs.map(async (job) => {
          try {
            const response = await apiClient.get(`/jobs/${job.id}`);
            const freshJobData = response.data?.data;

            if (freshJobData) {
              if (freshJobData.status === "CANCELLED") {
                activeJobs.value = activeJobs.value.filter(
                  (j) => j.id !== job.id,
                );
              } else {
                updateJobFromPoll(freshJobData);
              }
            }
          } catch (err: any) {
            if (err.response?.status === 404) {
              activeJobs.value = activeJobs.value.filter(
                (j) => j.id !== job.id,
              );
            } else {
              console.error(
                `Failed lookup metrics for job execution ${job.id}:`,
                err,
              );
              updateJobStatus(job.id, "FAILED");
            }
          }
        }),
      );
    }, 2500);
  };

  const fetchCompletedZipLink = async (fullFolderPath: string) => {
    const activeJob = activeJobs.value.find(
      (j) => j.folder_name === fullFolderPath && j.status === "COMPLETED",
    );

    if (!activeJob) {
      console.warn(`No completed zip job found for path: ${fullFolderPath}`);
      return;
    }

    try {
      const response = await apiClient.get(
        `/downloads/presigned/${activeJob.id}`,
      );
      const downloadUrl = response.data?.downloadUrl;

      if (!downloadUrl) throw new Error("Zip archive link missing.");

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to fetch generated zip distribution stream:", err);
      error.value = "Failed to stream packaged folder down to disk.";
    }
  };

  const stopPolling = () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    setPolling(false);
  };

  const reset = () => {
    activeJobs.value = [];
    loading.value = false;
    isPolling.value = false;
    error.value = null;
  };

  return {
    activeJobs,
    loading,
    isPolling,
    error,
    addJob,
    updateJobStatus,
    updateJobFromPoll,
    setJobs,
    setPolling,
    setError,
    reset,
    downloadFolder,
    cancelJob,
    startPollingForJobs,
    fetchRecentJobs,
    fetchCompletedZipLink,
  };
});

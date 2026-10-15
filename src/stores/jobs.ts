import apiClient from "@/api/client";
import { defineStore } from "pinia";
import { ref } from "vue";
import { sanitizePath } from "@/utils/formatters";
import axios from "axios";

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

interface ZipRequestResponse {
  jobId: string;
  status: Job["status"];
}

interface JobsListResponse {
  data?: Job[];
}

interface SingleJobResponse {
  data?: Job;
}

interface PresignedDownloadResponse {
  downloadUrl?: string;
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

  const downloadFolder = async (folderName: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const sanitizedFolder = sanitizePath(folderName);

      const response = await apiClient.post<ZipRequestResponse>(
        "/folders/zip-request",
        {
          folder_name: sanitizedFolder,
        },
      );

      const { jobId, status } = response.data;

      const newJob: Job = {
        id: jobId,
        folder_name: sanitizedFolder,
        status,
        created_at: new Date().toISOString(),
      };

      addJob(newJob);
      startPollingForJobs();
    } catch (err: unknown) {
      console.error("Folder packing serialization setup failed:", err);
      if (axios.isAxiosError(err)) {
        error.value =
          (err.response?.data as { message?: string })?.message ||
          "Failed to initiate folder compression task.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to initiate folder compression task.";
      }
    } finally {
      loading.value = false;
    }
  };

  const cancelJob = async (jobId: string): Promise<void> => {
    error.value = null;

    try {
      await apiClient.patch(`/jobs/${jobId}`, { status: "CANCELLED" });

      updateJobStatus(jobId, "CANCELLED");

      const remainingUnfinishedJobs = activeJobs.value.filter(
        (j) =>
          j.status === "PENDING" ||
          j.status === "RUNNING" ||
          j.status === "PROCESSING",
      );

      if (remainingUnfinishedJobs.length === 0) {
        stopPolling();
      }
    } catch (err: unknown) {
      console.error(`Failed to terminate job ${jobId}:`, err);
      if (axios.isAxiosError(err)) {
        error.value =
          (err.response?.data as { message?: string })?.message ||
          "Failed to cancel the active download job.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to cancel the active download job.";
      }
    }
  };

  const fetchRecentJobs = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get<JobsListResponse>("/jobs");
      const rawJobs =
        response.data?.data?.filter(
          (job: Job) => !isJobExpired(job) && job.status !== "CANCELLED",
        ) || [];

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
    } catch (err: unknown) {
      console.error("Failed to fetch recent jobs:", err);
      if (axios.isAxiosError(err)) {
        error.value =
          (err.response?.data as { message?: string })?.message ||
          "Failed to fetch recent jobs.";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to fetch recent jobs.";
      }
    } finally {
      loading.value = false;
    }
  };

  const startPollingForJobs = (): void => {
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
            const response = await apiClient.get<SingleJobResponse>(
              `/jobs/${job.id}`,
            );
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
          } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
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

  const fetchCompletedZipLink = async (
    fullFolderPath: string,
  ): Promise<void> => {
    const activeJob = activeJobs.value.find(
      (j) => j.folder_name === fullFolderPath && j.status === "COMPLETED",
    );

    if (!activeJob) {
      console.warn(`No completed zip job found for path: ${fullFolderPath}`);
      return;
    }

    try {
      const response = await apiClient.get<PresignedDownloadResponse>(
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
    } catch (err: unknown) {
      console.error("Failed to fetch generated zip distribution stream:", err);
      if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Failed to stream packaged folder down to disk.";
      }
    }
  };

  const stopPolling = (): void => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    setPolling(false);
  };

  const reset = (): void => {
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

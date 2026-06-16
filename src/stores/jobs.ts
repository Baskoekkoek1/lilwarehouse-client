import apiClient from "@/api/client";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface Job {
  id: string;
  folder_name: string;
  status: "PENDING" | "RUNNING" | "PROCESSING" | "COMPLETED" | "FAILED";
  created_at?: string;
}

export const useJobsStore = defineStore("jobs", () => {
  // State
  const activeJobs = ref<Job[]>([]);
  const loading = ref(false);
  const isPolling = ref(false);
  const error = ref<string | null>(null);

  let pollingIntervalId: ReturnType<typeof setInterval> | null = null;

  // Actions
  const addJob = (job: Job): void => {
    activeJobs.value.push(job);
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

            if (freshJobData?.status) {
              updateJobStatus(job.id, freshJobData.status);

              if (freshJobData.status === "COMPLETED") {
                await fetchCompletedZipLink(job.id);
              }
            }
          } catch (err) {
            console.error(
              `Failed lookup metrics for job execution ${job.id}:`,
              err,
            );
            updateJobStatus(job.id, "FAILED");
          }
        }),
      );
    }, 2500);
  };

  const fetchCompletedZipLink = async (jobId: string) => {
    try {
      const response = await apiClient.get(`/downloads/presigned/${jobId}`);
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
    setJobs,
    setPolling,
    setError,
    reset,
    downloadFolder,
    startPollingForJobs,
  };
});

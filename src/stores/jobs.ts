import { defineStore } from "pinia";
import { ref } from "vue";

export const useJobsStore = defineStore("jobs", () => {
  // State
  const activeJobs = ref<any[]>([]);
  const loading = ref(false);
  const isPolling = ref(false);
  const error = ref<string | null>(null);

  // Actions
  function addJob(job: any) {
    activeJobs.value.push(job);
  }

  function updateJobStatus(jobId: string, status: string) {
    const index = activeJobs.value.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      activeJobs.value[index].status = status;
    }
  }

  function setJobs(jobs: any[]) {
    activeJobs.value = jobs;
  }

  function setPolling(state: boolean) {
    isPolling.value = state;
  }

  function setError(message: string | null) {
    error.value = message;
  }

  function reset() {
    activeJobs.value = [];
    loading.value = false;
    isPolling.value = false;
    error.value = null;
  }

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
  };
});

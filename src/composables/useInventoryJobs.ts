import { onMounted } from "vue";
import { useInventoryStore, type VirtualItem } from "@/stores/inventory";
import { useJobsStore, type Job } from "@/stores/jobs";

export function useInventoryJobs() {
  const inventoryStore = useInventoryStore();
  const jobsStore = useJobsStore();

  const getFullFolderPath = (fileName: string): string => {
    const basePath =
      inventoryStore.currentPath === "/" ? "" : inventoryStore.currentPath;
    return basePath ? `${basePath}/${fileName}` : fileName;
  };

  const getJob = (fileName: string): Job | undefined => {
    const fullFolderPath = getFullFolderPath(fileName);
    const matchingJobs = jobsStore.activeJobs.filter(
      (j) => j.folder_name === fullFolderPath,
    );

    if (matchingJobs.length === 0) return undefined;

    return matchingJobs.reduce((latest, current) =>
      new Date(current.created_at) > new Date(latest.created_at)
        ? current
        : latest,
    );
  };

  const getFolderJobStatus = (fileName: string): string => {
    const thisJob = getJob(fileName);
    return thisJob ? thisJob.status : "IDLE";
  };

  const getJobProgress = (fileName: string): number => {
    const job = getJob(fileName);
    if (!job || !job.total_files) return 0;

    const processed = job.processed_files || 0;
    const total = job.total_files || 1;

    return Math.min(100, Math.round((processed / total) * 100));
  };

  const handleDownloadClick = (item: VirtualItem) => {
    if (item.type === "file" && item.b2_file_id) {
      inventoryStore.downloadFile(item.b2_file_id);
      return;
    }
    if (item.type !== "folder") return;

    const fullFolderPath = getFullFolderPath(item.file_name);
    const folderStatus = getFolderJobStatus(item.file_name);

    if (["IDLE", "FAILED", "CANCELLED"].includes(folderStatus)) {
      jobsStore.downloadFolder(fullFolderPath);
    } else if (folderStatus === "COMPLETED") {
      jobsStore.fetchCompletedZipLink(fullFolderPath);
    }
  };

  onMounted(() => {
    jobsStore.fetchRecentJobs();
  });

  return {
    jobsStore,
    inventoryStore,
    getJob,
    getFolderJobStatus,
    getJobProgress,
    getFullFolderPath,
    handleDownloadClick,
  };
}

<template>
  <div v-if="inventory.currentDirectoryContent.length > 0">
    <v-table theme="dark" class="rounded-lg border">
      <thead>
        <tr>
          <th class="text-uppercase text-caption font-weight-bold">Name</th>
          <th class="text-uppercase text-caption font-weight-bold text-right">
            Size
          </th>
          <th class="text-uppercase text-caption font-weight-bold text-right">
            Uploaded
          </th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in inventory.currentDirectoryContent"
          :key="item.id"
          class="inventory-row"
        >
          <td
            @click="handleItemClick(item)"
            :class="{ 'folder-row': item.type === 'folder' }"
            class="py-3"
          >
            <div class="d-flex align-center">
              <v-icon
                :icon="getFileIcon(item.file_name, item.type)"
                class="mr-3"
                :color="item.type === 'folder' ? 'primary' : 'grey-lighten-1'"
              />
              <span class="text-truncate" style="max-width: 250px">
                {{ item.file_name }}
                <v-tooltip activator="parent" location="top">
                  {{ item.file_name }}
                </v-tooltip>
              </span>
            </div>
          </td>
          <td class="text-right text-grey-lighten-1">
            {{
              item.type === "folder" ? "--" : formatBytes(item.file_size || 0)
            }}
          </td>
          <td class="text-right text-grey-lighten-1 text-caption">
            {{ formatDate(item.upload_date) }}
          </td>
          <td class="text-right" style="width: 160px">
            <div
              class="d-flex align-center justify-end w-100 pe-2"
              style="min-height: 36px"
            >
              <template v-if="item.type === 'folder'">
                <!-- PENDING / QUEUED STATE -->
                <template
                  v-if="getFolderJobStatus(item.file_name) === 'PENDING'"
                >
                  <v-progress-circular
                    indeterminate
                    size="18"
                    width="2"
                    color="warning"
                    class="mr-2"
                  />
                  <span
                    class="text-caption text-warning font-weight-medium mr-2"
                  >
                    Queued
                  </span>
                  <button
                    @click.stop="
                      jobsStore.cancelJob(getJob(item.file_name)!.id)
                    "
                    class="action-btn"
                  >
                    <v-icon icon="mdi-close-circle" color="error" size="18" />
                  </button>
                </template>

                <!-- PROCESSING STATE -->
                <template
                  v-else-if="
                    getFolderJobStatus(item.file_name) === 'PROCESSING' ||
                    getFolderJobStatus(item.file_name) === 'RUNNING'
                  "
                >
                  <div
                    class="w-100 flex-grow-1 mr-2 text-left d-flex align-center ga-2"
                    style="max-width: 140px"
                  >
                    <v-progress-linear
                      v-if="!getJob(item.file_name)?.total_files"
                      indeterminate
                      color="primary"
                      height="12"
                      rounded
                      striped
                    />
                    <v-progress-linear
                      v-else
                      :model-value="getJobProgress(item.file_name)"
                      color="primary"
                      height="12"
                      rounded
                      striped
                    >
                      <template v-slot:default="{ value }">
                        <strong class="text-white" style="font-size: 8px"
                          >{{ value }}%</strong
                        >
                      </template>
                    </v-progress-linear>

                    <button
                      @click.stop="
                        jobsStore.cancelJob(getJob(item.file_name)!.id)
                      "
                      class="action-btn ml-1"
                    >
                      <v-icon icon="mdi-close-circle" color="error" size="18" />
                    </button>
                  </div>
                </template>

                <!-- CANCELLED STATE (TEXT + ICON RETRY) -->
                <template
                  v-else-if="getFolderJobStatus(item.file_name) === 'CANCELLED'"
                >
                  <span
                    class="text-caption text-warning font-weight-medium mr-2"
                  >
                    Cancelled
                  </span>
                  <button
                    @click.stop="handleDownloadClick(item)"
                    class="action-btn"
                  >
                    <v-icon icon="mdi-refresh" color="warning" />
                    <v-tooltip activator="parent" location="top">
                      Try Again
                    </v-tooltip>
                  </button>
                </template>

                <!-- FAILED STATE -->
                <template
                  v-else-if="getFolderJobStatus(item.file_name) === 'FAILED'"
                >
                  <span class="text-caption text-error font-weight-medium mr-2">
                    Failed
                  </span>
                  <button
                    @click.stop="handleDownloadClick(item)"
                    class="action-btn"
                  >
                    <v-icon icon="mdi-refresh" color="error" />
                    <v-tooltip activator="parent" location="top">
                      Try Again
                    </v-tooltip>
                  </button>
                </template>

                <!-- COMPLETED / IDLE STATE BUTTON -->
                <button
                  v-else
                  @click.stop="handleDownloadClick(item)"
                  class="action-btn"
                >
                  <v-icon
                    v-if="getFolderJobStatus(item.file_name) === 'COMPLETED'"
                    icon="mdi-download-box"
                    color="success"
                  />
                  <v-icon
                    v-else-if="getFolderJobStatus(item.file_name) === 'IDLE'"
                    icon="mdi-folder-download"
                    color="primary"
                  />
                </button>
              </template>

              <!-- FILE DOWNLOAD -->
              <template v-else>
                <button
                  @click.stop="handleDownloadClick(item)"
                  class="action-btn"
                >
                  <v-progress-circular
                    v-if="inventory.downloadingFileId === item.b2_file_id"
                    indeterminate
                    size="20"
                    width="2"
                    color="primary"
                  />
                  <v-icon v-else icon="mdi-download" color="primary" />
                </button>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>

    <div v-if="inventory.hasMoreFiles" class="d-flex justify-center mt-4">
      <v-btn
        color="secondary"
        variant="outlined"
        prepend-icon="mdi-chevron-double-down"
        :loading="inventory.loading"
        @click="inventory.fetchCurrentDirectory()"
      >
        Load More Files
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useInventoryStore, type VirtualItem } from "@/stores/inventory";
import { useJobsStore, type Job } from "@/stores/jobs";
import { formatBytes, formatDate } from "@/utils/formatters";
import { getFileIcon } from "@/utils/fileIcons";

const inventory = useInventoryStore();
const jobsStore = useJobsStore();

const handleItemClick = (item: any) => {
  if (item.type === "folder") {
    const cleanPath =
      inventory.currentPath === "/" ? "" : inventory.currentPath;
    const newPath = cleanPath
      ? `${cleanPath}/${item.file_name}`
      : item.file_name;

    inventory.navigateTo(newPath);
  }
};

const handleDownloadClick = (item: VirtualItem) => {
  if (item.type === "file" && item.b2_file_id) {
    inventory.downloadFile(item.b2_file_id);
    return;
  }
  if (item.type !== "folder") return;

  const basePath = inventory.currentPath === "/" ? "" : inventory.currentPath;
  const fullFolderPath = basePath
    ? `${basePath}/${item.file_name}`
    : `${item.file_name}`;

  const folderStatus = getFolderJobStatus(item.file_name);
  if (
    folderStatus === "IDLE" ||
    folderStatus === "FAILED" ||
    folderStatus === "CANCELLED"
  ) {
    jobsStore.downloadFolder(fullFolderPath);
  } else if (folderStatus === "COMPLETED") {
    jobsStore.fetchCompletedZipLink(fullFolderPath);
  }
};

const getJob = (fileName: string): Job | undefined => {
  const basePath = inventory.currentPath === "/" ? "" : inventory.currentPath;
  const fullFolderPath = basePath ? `${basePath}/${fileName}` : `${fileName}`;

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

onMounted(() => {
  jobsStore.fetchRecentJobs();
});
</script>

<style scoped>
.inventory-row {
  transition: background-color 0.2s ease;
}

.folder-row {
  cursor: pointer;
  transition: color 0.2s ease;
}

.folder-row:hover {
  color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

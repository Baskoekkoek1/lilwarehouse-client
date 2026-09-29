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
          <th class="text-right pe-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in inventory.currentDirectoryContent"
          :key="item.id"
          class="inventory-row"
        >
          <!-- NAME & ICON -->
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
              <span
                class="text-truncate font-weight-medium"
                style="max-width: 320px"
              >
                {{ item.file_name }}
                <v-tooltip activator="parent" location="top">
                  {{ item.file_name }}
                </v-tooltip>
              </span>
            </div>
          </td>

          <!-- SIZE -->
          <td class="text-right text-grey-lighten-1">
            {{
              item.type === "folder" ? "--" : formatBytes(item.file_size || 0)
            }}
          </td>

          <!-- UPLOADED DATE -->
          <td class="text-right text-grey-lighten-1 text-caption">
            {{ formatDate(item.upload_date) }}
          </td>

          <!-- ACTIONS -->
          <td class="text-right" style="width: 170px">
            <div
              class="d-flex align-center justify-end w-100 pe-1 ga-1"
              style="min-height: 36px"
            >
              <!-- FOLDER ACTIONS -->
              <template v-if="item.type === 'folder'">
                <!-- PENDING / QUEUED STATE -->
                <template
                  v-if="getFolderJobStatus(item.file_name) === 'PENDING'"
                >
                  <v-progress-circular
                    indeterminate
                    size="16"
                    width="2"
                    color="warning"
                    class="mr-1"
                  />
                  <span
                    class="text-caption text-warning font-weight-medium mr-1"
                  >
                    Queued
                  </span>
                  <v-btn
                    icon="mdi-close-circle"
                    variant="text"
                    density="compact"
                    color="error"
                    class="action-btn"
                    @click.stop="
                      jobsStore.cancelJob(getJob(item.file_name)!.id)
                    "
                  >
                    <v-tooltip activator="parent" location="top"
                      >Cancel</v-tooltip
                    >
                  </v-btn>
                </template>

                <!-- PROCESSING STATE -->
                <template
                  v-else-if="
                    getFolderJobStatus(item.file_name) === 'PROCESSING' ||
                    getFolderJobStatus(item.file_name) === 'RUNNING'
                  "
                >
                  <div
                    class="w-100 flex-grow-1 mr-1 text-left d-flex align-center ga-2"
                    style="max-width: 140px"
                  >
                    <v-progress-linear
                      v-if="!getJob(item.file_name)?.total_files"
                      indeterminate
                      color="primary"
                      height="10"
                      rounded
                      striped
                    />
                    <v-progress-linear
                      v-else
                      :model-value="getJobProgress(item.file_name)"
                      color="primary"
                      height="10"
                      rounded
                      striped
                    >
                      <template v-slot:default="{ value }">
                        <strong class="text-white" style="font-size: 8px"
                          >{{ value }}%</strong
                        >
                      </template>
                    </v-progress-linear>

                    <v-btn
                      icon="mdi-close-circle"
                      variant="text"
                      density="compact"
                      color="error"
                      class="action-btn"
                      @click.stop="
                        jobsStore.cancelJob(getJob(item.file_name)!.id)
                      "
                    >
                      <v-tooltip activator="parent" location="top"
                        >Cancel</v-tooltip
                      >
                    </v-btn>
                  </div>
                </template>

                <!-- CANCELLED STATE -->
                <template
                  v-else-if="getFolderJobStatus(item.file_name) === 'CANCELLED'"
                >
                  <span
                    class="text-caption text-warning font-weight-medium mr-1"
                  >
                    Cancelled
                  </span>
                  <v-btn
                    icon="mdi-refresh"
                    variant="text"
                    density="comfortable"
                    color="warning"
                    class="action-btn"
                    @click.stop="handleDownloadClick(item)"
                  >
                    <v-tooltip activator="parent" location="top"
                      >Try Again</v-tooltip
                    >
                  </v-btn>
                </template>

                <!-- FAILED STATE -->
                <template
                  v-else-if="getFolderJobStatus(item.file_name) === 'FAILED'"
                >
                  <span class="text-caption text-error font-weight-medium mr-1">
                    Failed
                  </span>
                  <v-btn
                    icon="mdi-refresh"
                    variant="text"
                    density="comfortable"
                    color="error"
                    class="action-btn"
                    @click.stop="handleDownloadClick(item)"
                  >
                    <v-tooltip activator="parent" location="top"
                      >Try Again</v-tooltip
                    >
                  </v-btn>
                </template>

                <!-- COMPLETED / IDLE STATE BUTTON -->
                <v-btn
                  v-else
                  :icon="
                    getFolderJobStatus(item.file_name) === 'COMPLETED'
                      ? 'mdi-download-box'
                      : 'mdi-folder-download'
                  "
                  variant="text"
                  density="comfortable"
                  :color="
                    getFolderJobStatus(item.file_name) === 'COMPLETED'
                      ? 'success'
                      : 'primary'
                  "
                  class="action-btn"
                  @click.stop="handleDownloadClick(item)"
                >
                  <v-tooltip activator="parent" location="top">
                    {{
                      getFolderJobStatus(item.file_name) === "COMPLETED"
                        ? "Download ZIP"
                        : "Download Folder"
                    }}
                  </v-tooltip>
                </v-btn>

                <!-- DELETE FOLDER BUTTON -->
                <v-btn
                  icon
                  variant="text"
                  density="comfortable"
                  color="error"
                  class="action-btn"
                  :disabled="inventory.deletingFolderName === item.file_name"
                  @click.stop="handleDeleteFolderClick(item)"
                >
                  <v-progress-circular
                    v-if="inventory.deletingFolderName === item.file_name"
                    indeterminate
                    size="18"
                    width="2"
                    color="error"
                  />
                  <v-icon v-else icon="mdi-delete" />
                  <v-tooltip activator="parent" location="top">
                    Delete Folder
                  </v-tooltip>
                </v-btn>
              </template>

              <!-- FILE ACTIONS (DOWNLOAD & DELETE) -->
              <template v-else>
                <v-btn
                  icon
                  variant="text"
                  density="comfortable"
                  color="primary"
                  class="action-btn"
                  :disabled="
                    inventory.downloadingFileId === item.b2_file_id ||
                    inventory.deletingFileId === item.id
                  "
                  @click.stop="handleDownloadClick(item)"
                >
                  <v-progress-circular
                    v-if="inventory.downloadingFileId === item.b2_file_id"
                    indeterminate
                    size="18"
                    width="2"
                    color="primary"
                  />
                  <v-icon v-else icon="mdi-download" />
                  <v-tooltip activator="parent" location="top">
                    Download File
                  </v-tooltip>
                </v-btn>

                <v-btn
                  icon
                  variant="text"
                  density="comfortable"
                  color="error"
                  class="action-btn"
                  :disabled="
                    inventory.downloadingFileId === item.b2_file_id ||
                    inventory.deletingFileId === item.id
                  "
                  @click.stop="handleDeleteClick(item)"
                >
                  <v-progress-circular
                    v-if="inventory.deletingFileId === item.id"
                    indeterminate
                    size="18"
                    width="2"
                    color="error"
                  />
                  <v-icon v-else icon="mdi-delete" />
                  <v-tooltip activator="parent" location="top">
                    Delete File
                  </v-tooltip>
                </v-btn>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- LOAD MORE BUTTON -->
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

    <!-- CONFIRM DIALOG -->
    <ConfirmDialog
      ref="confirmDialog"
      :title="dialogTitle"
      :message="dialogMessage"
      confirm-text="Delete"
      color="error"
      icon="mdi-delete-alert-outline"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useInventoryStore, type VirtualItem } from "@/stores/inventory";
import { useJobsStore, type Job } from "@/stores/jobs";
import { formatBytes, formatDate } from "@/utils/formatters";
import { getFileIcon } from "@/utils/fileIcons";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const inventory = useInventoryStore();
const jobsStore = useJobsStore();

const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const dialogTitle = ref("Delete Item");
const dialogMessage = ref("");

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

const handleDeleteClick = async (item: VirtualItem) => {
  if (item.type !== "file") return;

  dialogTitle.value = "Delete File";
  dialogMessage.value = `Are you sure you want to permanently delete "${item.file_name}"? This action cannot be undone.`;

  const confirmed = await confirmDialog.value?.open();
  if (!confirmed) return;

  await inventory.deleteFile(item.id);
};

const handleDeleteFolderClick = async (item: VirtualItem) => {
  if (item.type !== "folder") return;

  const basePath = inventory.currentPath === "/" ? "" : inventory.currentPath;
  const fullFolderPath = basePath
    ? `${basePath}/${item.file_name}`
    : `${item.file_name}`;

  dialogTitle.value = "Delete Folder";
  dialogMessage.value = `Are you sure you want to delete folder "${item.file_name}" and ALL files inside it? This action cannot be undone.`;

  const confirmed = await confirmDialog.value?.open();
  if (!confirmed) return;

  await inventory.deleteFolder(fullFolderPath);
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
  transition: background-color 0.15s ease;
}

.inventory-row:hover {
  background-color: rgba(255, 255, 255, 0.03) !important;
}

.folder-row {
  cursor: pointer;
  transition: color 0.15s ease;
}

.folder-row:hover {
  color: rgb(var(--v-theme-primary)) !important;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

/* Action buttons stay muted at 60% opacity until hovering over the row */
.action-btn {
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.inventory-row:hover .action-btn {
  opacity: 1;
}
</style>

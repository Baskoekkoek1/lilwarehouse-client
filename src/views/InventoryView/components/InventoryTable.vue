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
          <td>
            <button @click.stop="handleDownloadClick(item)">
              <template v-if="item.type === 'folder'">
                <v-progress-circular
                  v-if="isFolderZipping(item.file_name)"
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                />
                <v-icon v-else icon="mdi-folder-download" color="primary" />
              </template>

              <template v-else>
                <v-progress-circular
                  v-if="inventory.downloadingFileId === item.b2_file_id"
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                />
                <v-icon v-else icon="mdi-download" color="primary" />
              </template>
            </button>
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
import { useInventoryStore, type VirtualItem } from "@/stores/inventory";
import { useJobsStore } from "@/stores/jobs";
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
  if (item.type === "folder") {
    const basePath = inventory.currentPath === "/" ? "" : inventory.currentPath;

    const fullFolderPath = basePath
      ? `${basePath}/${item.file_name}/`
      : `${item.file_name}/`;

    jobsStore.downloadFolder(fullFolderPath);
  } else if (item.type === "file" && item.b2_file_id) {
    inventory.downloadFile(item.b2_file_id);
  }
};

const isFolderZipping = (fileName: string) => {
  const basePath = inventory.currentPath === "/" ? "" : inventory.currentPath;
  const fullFolderPath = basePath ? `${basePath}/${fileName}/` : `${fileName}/`;

  return jobsStore.activeJobs.some(
    (job) =>
      job.folder_name === fullFolderPath &&
      (job.status === "RUNNING" || job.status === "PENDING"),
  );
};
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
</style>

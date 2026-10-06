<template>
  <div>
    <v-card
      flat
      color="surface"
      class="border rounded-lg mx-auto"
      style="max-width: 1200px"
    >
      <!-- Top Header Bar -->
      <div class="d-flex align-center justify-space-between px-4 py-3 border-b">
        <InventoryBreadcrumbs />
        <span class="text-caption text-grey-lighten-1">
          {{ inventoryStore.currentDirectoryContent.length }} items
        </span>
      </div>

      <!-- Inventory Table -->
      <v-table theme="dark" class="bg-transparent">
        <thead>
          <tr>
            <th class="table-header text-left ps-4">Name</th>
            <th class="table-header text-right">Size</th>
            <th class="table-header text-right">Uploaded</th>
            <th class="table-header text-right pe-6">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in inventoryStore.currentDirectoryContent"
            :key="item.id"
            class="inventory-row"
          >
            <!-- Name & Icon -->
            <td
              @click="handleItemClick(item)"
              :class="{ 'folder-row': item.type === 'folder' }"
              class="py-3 ps-4"
            >
              <div class="d-flex align-center">
                <v-icon
                  :icon="getFileIcon(item.file_name, item.type)"
                  :color="getFileIconColor(item.file_name, item.type)"
                  class="mr-3"
                />
                <span
                  class="text-truncate font-weight-medium"
                  style="max-width: 320px"
                >
                  {{ item.file_name }}
                  <v-tooltip activator="parent" location="top">{{
                    item.file_name
                  }}</v-tooltip>
                </span>
              </div>
            </td>

            <!-- Size -->
            <td class="text-right text-grey-lighten-1 tabular-nums">
              <span v-if="item.type === 'folder'" class="text-muted-dash"
                >--</span
              >
              <template v-else>{{ formatBytes(item.file_size || 0) }}</template>
            </td>

            <!-- Uploaded Date -->
            <td
              class="text-right text-grey-lighten-1 text-caption tabular-nums"
            >
              {{ formatDate(item.upload_date) }}
            </td>

            <!-- Actions -->
            <td class="text-right pe-6" style="width: 180px">
              <!-- Folder Actions -->
              <InventoryFolderActions
                v-if="item.type === 'folder'"
                :status="getFolderJobStatus(item.file_name)"
                :progress="getJobProgress(item.file_name)"
                :total-files="getJob(item.file_name)?.total_files"
                :job-id="getJob(item.file_name)?.id"
                :is-deleting="
                  inventoryStore.deletingFolderName === item.file_name
                "
                @download="handleDownloadClick(item)"
                @delete="handleDeleteFolderClick(item)"
                @cancel="jobsStore.cancelJob($event)"
              />

              <!-- File Actions -->
              <InventoryFileActions
                v-else
                :is-downloading="
                  inventoryStore.downloadingFileId === item.b2_file_id
                "
                :is-deleting="inventoryStore.deletingFileId === item.id"
                @download="handleDownloadClick(item)"
                @delete="handleDeleteClick(item)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Load More -->
    <div v-if="inventoryStore.hasMoreFiles" class="d-flex justify-center mt-4">
      <v-btn
        color="secondary"
        variant="outlined"
        prepend-icon="mdi-chevron-double-down"
        :loading="inventoryStore.loading"
        @click="inventoryStore.fetchCurrentDirectory()"
      >
        Load More Files
      </v-btn>
    </div>

    <!-- Confirm Dialog -->
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
import { ref } from "vue";
import { useRouter } from "vue-router";
import { type VirtualItem } from "@/stores/inventory";
import { formatBytes, formatDate } from "@/utils/formatters";
import { getFileIcon, getFileIconColor } from "@/utils/fileIcons";
import { useInventoryJobs } from "@/composables/useInventoryJobs";

import ConfirmDialog from "../../../components/common/ConfirmDialog.vue/index.js";
import InventoryBreadcrumbs from "../../../components/common/BreadCrumbs.vue/index.js";
import InventoryFolderActions from "./InventoryFolderActions.vue";
import InventoryFileActions from "./InventoryFileActions.vue";

const router = useRouter();
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const dialogTitle = ref("Delete Item");
const dialogMessage = ref("");

const {
  jobsStore,
  inventoryStore,
  getJob,
  getFolderJobStatus,
  getJobProgress,
  getFullFolderPath,
  handleDownloadClick,
} = useInventoryJobs();

const handleItemClick = (item: VirtualItem) => {
  if (item.type === "folder") {
    const cleanPath =
      inventoryStore.currentPath === "/" ? "" : inventoryStore.currentPath;
    const newPath = cleanPath
      ? `${cleanPath}/${item.file_name}`
      : item.file_name;
    router.push({ query: { path: newPath } });
  }
};

const handleDeleteClick = async (item: VirtualItem) => {
  if (item.type !== "file") return;
  dialogTitle.value = "Delete File";
  dialogMessage.value = `Are you sure you want to permanently delete "${item.file_name}"? This action cannot be undone.`;

  const confirmed = await confirmDialog.value?.open();
  if (confirmed) await inventoryStore.deleteFile(item.id);
};

const handleDeleteFolderClick = async (item: VirtualItem) => {
  if (item.type !== "folder") return;
  const fullFolderPath = getFullFolderPath(item.file_name);

  dialogTitle.value = "Delete Folder";
  dialogMessage.value = `Are you sure you want to delete folder "${item.file_name}" and ALL files inside it? This action cannot be undone.`;

  const confirmed = await confirmDialog.value?.open();
  if (confirmed) await inventoryStore.deleteFolder(fullFolderPath);
};
</script>

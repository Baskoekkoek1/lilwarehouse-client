<template>
  <div
    class="d-flex align-center ga-2 px-3 py-1-5 bg-surface rounded-pill border"
  >
    <v-icon icon="mdi-folder-outline" size="18" color="primary" />

    <v-breadcrumbs
      :items="breadcrumbItems"
      class="pa-0 text-body-2"
      active-color="primary"
    >
      <template v-slot:divider>
        <v-icon
          icon="mdi-chevron-right"
          size="14"
          class="text-medium-emphasis"
        />
      </template>

      <template v-slot:title="{ item }">
        <span
          class="breadcrumb-item"
          :class="{
            'text-high-emphasis font-weight-medium': item.disabled,
            'text-medium-emphasis clickable': !item.disabled,
          }"
          @click="
            !item.disabled &&
            handleBreadcrumbClick((item as any).raw?.path || (item as any).path)
          "
        >
          {{ item.title }}
        </span>
      </template>
    </v-breadcrumbs>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useInventoryStore } from "@/stores/inventory";
import { useAuthStore } from "@/stores/auth";

interface BreadcrumbItem {
  title: string;
  disabled: boolean;
  path: string;
}

const router = useRouter();
const inventoryStore = useInventoryStore();
const authStore = useAuthStore();

const handleBreadcrumbClick = (path: string) => {
  // Push the path to the URL query string to maintain browser back/forward history
  router.push({
    query: path === "/" ? {} : { path },
  });
};

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [
    {
      title: `${authStore.user?.username ?? "stranger"}`,
      disabled: inventoryStore.currentPath === "/",
      path: "/",
    },
  ];

  if (inventoryStore.currentPath === "/") return items;

  const parts = inventoryStore.currentPath.split("/").filter(Boolean);
  let accumulatedPath = "";

  parts.forEach((part, index) => {
    accumulatedPath += `/${part}`;
    const isLast = index === parts.length - 1;
    items.push({
      title: part,
      disabled: isLast,
      path: accumulatedPath,
    });
  });

  return items;
});
</script>

<style scoped>
.breadcrumb-item.clickable {
  cursor: pointer;
  transition: color 0.15s ease-in-out;
}

.breadcrumb-item.clickable:hover {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>

<template>
  <div
    class="d-flex align-center ga-2 px-3 py-1-5 bg-grey-darken-4 rounded-pill border"
  >
    <v-icon icon="mdi-folder-outline" size="18" color="primary" />

    <v-breadcrumbs
      :items="breadcrumbItems"
      class="pa-0 text-body-2"
      active-color="white"
      color="grey-lighten-1"
    >
      <template v-slot:divider>
        <v-icon icon="mdi-chevron-right" size="14" color="grey-darken-1" />
      </template>

      <template v-slot:title="{ item }">
        <span
          class="cursor-pointer"
          :class="{
            'text-white font-weight-medium': item.disabled,
            'text-grey-lighten-1': !item.disabled,
          }"
          @click="
            !item.disabled &&
            inventoryStore.navigateTo(
              (item as any).raw?.path || (item as any).path,
            )
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
import { useInventoryStore } from "@/stores/inventory";
import { useAuthStore } from "@/stores/auth";

interface BreadcrumbItem {
  title: string;
  disabled: boolean;
  path: string;
}

const inventoryStore = useInventoryStore();
const authStore = useAuthStore();

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
.cursor-pointer {
  cursor: pointer;
}
</style>

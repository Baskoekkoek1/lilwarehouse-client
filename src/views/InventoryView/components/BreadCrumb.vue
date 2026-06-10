<template>
  <v-breadcrumbs :items="breadcrumbItems" class="px-0">
    <template v-slot:divider>
      <v-icon icon="mdi-chevron-right"></v-icon>
    </template>

    <template v-slot:title="{ item }">
      <span
        class="text-body-2"
        :class="{ 'font-weight-bold text-primary': !item.disabled }"
        @click="!item.disabled && inventory.navigateTo((item as Crumb).rawPath)"
        style="cursor: pointer"
      >
        {{ item.title }}
      </span>
    </template>
  </v-breadcrumbs>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useInventoryStore } from "@/stores/inventory";

const inventory = useInventoryStore();

interface Crumb {
  title: string;
  disabled: boolean;
  rawPath: string;
}

const breadcrumbItems = computed(() => {
  const items = [
    {
      title: "Home",
      disabled: inventory.currentPath === "/",
      rawPath: "/",
    },
  ];

  if (inventory.currentPath === "/") return items;

  const parts = inventory.currentPath.split("/").filter(Boolean);
  const cumulativeSegments: string[] = [];

  parts.forEach((part, index) => {
    cumulativeSegments.push(part);

    const joinedPath = cumulativeSegments.join("/");

    items.push({
      title: part,
      disabled: index === parts.length - 1,
      rawPath: joinedPath,
    });
  });

  return items;
});
</script>

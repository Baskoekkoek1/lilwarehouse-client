import { defineStore } from "pinia";
import { computed } from "vue";
import { useAuthStore } from "./auth";
import { useInventoryStore } from "./inventory";
import { useJobsStore } from "./jobs";

export const useUIStore = defineStore("ui", () => {
  const auth = useAuthStore();
  const inventory = useInventoryStore();
  const jobs = useJobsStore();

  const isGlobalLoading = computed(() => {
    return auth.loading || inventory.loading || jobs.isPolling;
  });

  return { isGlobalLoading };
});

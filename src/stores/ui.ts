import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from "./auth";
import { useInventoryStore } from "./inventory";
import { useJobsStore } from "./jobs";

export const useUIStore = defineStore("ui", () => {
  //State
  const auth = useAuthStore();
  const inventory = useInventoryStore();
  const jobs = useJobsStore();

  //Getters
  const isGlobalLoading = computed(() => {
    return auth.loading || inventory.loading || jobs.isPolling;
  });

  const isLoginModalOpen = ref(false);

  //Actions

  const toggleLoginModal = () => {
    isLoginModalOpen.value = !isLoginModalOpen.value;
  };

  return { isGlobalLoading, isLoginModalOpen, toggleLoginModal };
});

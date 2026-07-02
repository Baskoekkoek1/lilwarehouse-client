import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from "./auth";
import { useInventoryStore } from "./inventory";

export const useUIStore = defineStore("ui", () => {
  //State
  const auth = useAuthStore();
  const inventory = useInventoryStore();

  //Getters
  const isGlobalLoading = computed(() => {
    return auth.loading || inventory.loading;
  });

  const isLoginModalOpen = ref(false);

  //Actions

  const toggleLoginModal = () => {
    isLoginModalOpen.value = !isLoginModalOpen.value;
  };

  return { isGlobalLoading, isLoginModalOpen, toggleLoginModal };
});

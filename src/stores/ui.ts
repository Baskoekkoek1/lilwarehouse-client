import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useTheme } from "vuetify";
import { useAuthStore } from "./auth";
import { useInventoryStore } from "./inventory";

export const useUIStore = defineStore("ui", () => {
  //State
  const auth = useAuthStore();
  const inventory = useInventoryStore();
  const theme = useTheme();

  const savedTheme = localStorage.getItem("user_theme") || "earthyLight";
  const currentTheme = ref(savedTheme);

  theme.global.name.value = currentTheme.value;

  //Getters
  const isGlobalLoading = computed(() => {
    return auth.loading || inventory.loading;
  });

  const isLoginModalOpen = ref(false);

  //Actions
  const toggleLoginModal = () => {
    isLoginModalOpen.value = !isLoginModalOpen.value;
  };

  const setTheme = (themeName: "earthyLight" | "earthyDark") => {
    currentTheme.value = themeName;
    theme.global.name.value = themeName;
    localStorage.setItem("user_theme", themeName);
  };

  const toggleTheme = () => {
    const nextTheme =
      currentTheme.value === "earthyDark" ? "earthyLight" : "earthyDark";
    setTheme(nextTheme);
  };

  return {
    isGlobalLoading,
    isLoginModalOpen,
    toggleLoginModal,
    currentTheme,
    setTheme,
    toggleTheme,
  };
});

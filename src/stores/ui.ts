import { defineStore } from "pinia";
import { computed, ref } from "vue";
import vuetify from "@/plugins/vuetify";
import { useAuthStore } from "./auth";
import { useInventoryStore } from "./inventory";

export const useUIStore = defineStore("ui", () => {
  const auth = useAuthStore();
  const inventory = useInventoryStore();

  const savedTheme =
    typeof window !== "undefined"
      ? localStorage.getItem("user_theme") || "earthyLight"
      : "earthyLight";

  const currentTheme = ref(savedTheme);

  try {
    vuetify.theme.change(savedTheme);
  } catch (err) {
    console.error("Failed to set initial Vuetify theme:", err);
  }

  const isLoginModalOpen = ref(false);

  const loginOpen = computed({
    get: () => isLoginModalOpen.value,
    set: (val) => {
      isLoginModalOpen.value = val;
    },
  });

  const isGlobalLoading = computed(() => {
    return auth.loading || inventory.loading;
  });

  const toggleLoginModal = () => {
    isLoginModalOpen.value = !isLoginModalOpen.value;
  };

  const setTheme = (themeName: "earthyLight" | "earthyDark") => {
    currentTheme.value = themeName;
    if (typeof window !== "undefined") {
      localStorage.setItem("user_theme", themeName);
    }
    try {
      vuetify.theme.change(themeName);
    } catch (err) {
      console.error("Failed to update Vuetify theme:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme =
      currentTheme.value === "earthyDark" ? "earthyLight" : "earthyDark";
    setTheme(nextTheme);
  };

  return {
    isGlobalLoading,
    isLoginModalOpen,
    loginOpen,
    toggleLoginModal,
    currentTheme,
    setTheme,
    toggleTheme,
  };
});

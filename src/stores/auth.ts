import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useInventoryStore } from "./inventory";
import { useJobsStore } from "./jobs";
import { useUIStore } from "./ui";
import apiClient from "../api/client";

interface User {
  id: string;
  username: string;
  scopes: string[];
}

export const useAuthStore = defineStore("auth", () => {
  // State
  const token = ref<string | null>(localStorage.getItem("lil_token"));
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem("lil_token", newToken);
  };

  const login = async (username: string, password: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post("/login", { username, password });

      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      user.value = userData;

      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Login failed";
      return false;
    } finally {
      loading.value = false;
    }
  };

  const fetchUserProfile = async () => {
    if (!token.value) return;

    loading.value = true;
    try {
      const response = await apiClient.get("/me");
      user.value = response.data.user;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);

      logout();

      const uiStore = useUIStore();
      uiStore.isLoginModalOpen = true;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    const inventory = useInventoryStore();
    const jobs = useJobsStore();

    token.value = null;
    user.value = null;
    localStorage.removeItem("lil_token");

    inventory.reset();
    jobs.reset();
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    setToken,
    fetchUserProfile,
  };
});

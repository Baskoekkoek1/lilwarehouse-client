import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useInventoryStore } from "./inventory";
import { useJobsStore } from "./jobs";
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
  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post("/login", { username, password });

      const newToken = response.data.token;
      token.value = newToken;
      user.value = response.data.user;

      localStorage.setItem("lil_token", newToken);

      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Login failed";
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    const inventory = useInventoryStore();
    const jobs = useJobsStore();

    token.value = null;
    user.value = null;
    localStorage.removeItem("lil_token");

    inventory.reset();
    jobs.reset();
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
  };
});

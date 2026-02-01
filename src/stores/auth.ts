import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiClient from "../api/client";

export const useAuthStore = defineStore("auth", () => {
  // State
  const token = ref<string | null>(localStorage.getItem("lil_token"));
  const user = ref<{ id: string } | null>(null);
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
    token.value = null;
    user.value = null;
    localStorage.removeItem("lil_token");
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

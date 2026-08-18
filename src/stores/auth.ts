import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useInventoryStore } from "./inventory";
import { useJobsStore } from "./jobs";
import { useUIStore } from "./ui";
import apiClient from "../api/client";
import axios from "axios";

interface User {
  id: string;
  username: string;
  scopes: string[];
}

const isTokenExpiringSoon = (
  jwtToken: string | null,
  bufferSeconds = 120,
): boolean => {
  if (!jwtToken) return true;
  try {
    const payloadBase64 = jwtToken.split(".")[1];
    if (!payloadBase64) return true;
    const decoded = JSON.parse(atob(payloadBase64));
    if (!decoded.exp) return false;
    const expiresAtMs = decoded.exp * 1000;
    return expiresAtMs - Date.now() < bufferSeconds * 1000;
  } catch {
    return true;
  }
};

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

  const refreshToken = async (): Promise<string | null> => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      if (data?.token) {
        setToken(data.token);
        return data.token;
      }
      return null;
    } catch (err) {
      logout();
      const uiStore = useUIStore();
      uiStore.isLoginModalOpen = true;
      return null;
    }
  };

  const checkAndRefreshTokenIfNeeded = async (): Promise<void> => {
    if (isTokenExpiringSoon(token.value)) {
      await refreshToken();
    }
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
    refreshToken,
    checkAndRefreshTokenIfNeeded,
  };
});

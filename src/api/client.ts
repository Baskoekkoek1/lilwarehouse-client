import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useUIStore } from "../stores/ui";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token && config.headers) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    // Handle Access Token Expiration
    if (
      response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const authStore = useAuthStore();
        const newToken = await authStore.refreshToken();

        if (!newToken) {
          throw new Error("Token refresh returned null");
        }

        if (!originalRequest.headers) originalRequest.headers = {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch (refreshServerError) {
        const authStore = useAuthStore();
        authStore.logout();

        const uiStore = useUIStore();
        uiStore.isLoginModalOpen = true;

        return Promise.reject(refreshServerError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;

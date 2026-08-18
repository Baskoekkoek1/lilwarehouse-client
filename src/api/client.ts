import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useUIStore } from "../stores/ui";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
};

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
    if (response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            if (!originalRequest.headers) originalRequest.headers = {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authStore = useAuthStore();

        // Issue background token refresh request
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.token;
        authStore.setToken(newToken);

        isRefreshing = false;
        onRefreshed(newToken);

        if (!originalRequest.headers) originalRequest.headers = {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch (refreshServerError) {
        isRefreshing = false;
        refreshSubscribers = [];

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

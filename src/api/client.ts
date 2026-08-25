import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useUIStore } from "../stores/ui";

let isRefreshing = false;
let refreshSubscribers: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
};

const onRefreshFailed = (err: unknown) => {
  refreshSubscribers.forEach((sub) => sub.reject(err));
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
    if (
      response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (token: string) => {
              if (!originalRequest.headers) originalRequest.headers = {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authStore = useAuthStore();
        const newToken = await authStore.refreshToken();

        if (!newToken) {
          throw new Error("Refresh token returned null");
        }

        isRefreshing = false;
        onRefreshed(newToken);

        if (!originalRequest.headers) originalRequest.headers = {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch (refreshServerError) {
        isRefreshing = false;
        onRefreshFailed(refreshServerError);

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

import axios from "axios";

const apiClient = axios.create({
  // Use an environment variable for the URL so it's easy to switch between local/prod
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// The "Security Gate" Interceptor
// This runs before every single request sent to your backend
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("lil_token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// The "Global Error" Interceptor
// If the backend returns 401 (Token Expired), we can handle it globally here
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Token expired or invalid. Redirecting to login...");
      localStorage.removeItem("lil_token");
      // We'll add the router redirect here once the router is set up
    }
    return Promise.reject(error);
  },
);

export default apiClient;

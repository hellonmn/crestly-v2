import axios, { AxiosError } from "axios";
import { authStore } from "./auth-store";

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = authStore.get().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // Token expired or rejected — boot the user back to login.
      authStore.clear();
    }
    return Promise.reject(err);
  },
);

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message.join(", ");
    if (typeof data?.message === "string") return data.message;
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

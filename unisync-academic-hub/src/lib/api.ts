import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import axios from "axios";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};

  const {
    data: { session },
  } = await getSupabase().auth.getSession();

  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const auth = await getAuthHeader();

  const headers = new Headers(options.headers || {});
  Object.entries(auth).forEach(([key, value]) => headers.set(key, value));

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return {} as T;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const auth = await getAuthHeader();

  if (auth.Authorization) {
    config.headers.set("Authorization", auth.Authorization);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export function useApiQuery<T>(
  key: string | string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => apiFetch<T>(endpoint),
    ...options,
  });
}

export function useApiMutation<TData, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  return useMutation({
    mutationFn,
    ...options,
  });
}
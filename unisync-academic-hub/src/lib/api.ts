import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import axios from "axios";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

/**
 * Normalize backend origin. Common mistakes:
 * - `https://…:8000` on tunnel hosts → public HTTPS is on 443; :8000 breaks TLS.
 * - `http://` tunnel URL from an HTTPS CloudFront page → upgrade to https (mixed content).
 * - Base URL includes a path → strip to origin only.
 */
function normalizeApiBaseUrl(raw: string): string {
  let trimmed = raw.trim();
  if (!trimmed) return "http://localhost:8000";

  // Forgot scheme → URL() fails or mis-resolves against CloudFront; tunnels need https://
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/trycloudflare\.com|ngrok-free\.dev|ngrok-free\.app|ngrok\.app|ngrok\.io/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
  }

  try {
    const u = new URL(trimmed);
    const host = u.hostname;
    const isTunnelPublic =
      host.endsWith(".trycloudflare.com") ||
      host.endsWith(".ngrok-free.dev") ||
      host.endsWith(".ngrok-free.app") ||
      host.endsWith(".ngrok.app") ||
      host.endsWith(".ngrok.io");

    if (isTunnelPublic) {
      if (u.protocol === "http:") u.protocol = "https:";
      if (u.port === "8000" || u.port === "80") u.port = "";
      if (u.pathname && u.pathname !== "/") {
        return u.origin;
      }
    }

    let out = u.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

const rawApiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** Backend API origin. Set VITE_API_URL at build time (tunnel https URL, no path, no :8000). */
export const API_BASE = normalizeApiBaseUrl(rawApiBase);

/** ngrok free tier may interstitial browser-like requests; this header lets API calls reach FastAPI. */
export function ngrokSkipBrowserWarningHeaders(): Record<string, string> {
  return API_BASE.includes("ngrok") ? { "ngrok-skip-browser-warning": "true" } : {};
}

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
  Object.entries(ngrokSkipBrowserWarningHeaders()).forEach(([key, value]) =>
    headers.set(key, value),
  );

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
  const ngrok = ngrokSkipBrowserWarningHeaders();
  for (const [k, v] of Object.entries(ngrok)) {
    config.headers.set(k, v);
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
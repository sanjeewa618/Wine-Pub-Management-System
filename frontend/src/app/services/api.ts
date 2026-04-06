const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
const TOKEN_STORAGE_KEY = "wine-pub-token";

export const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, "") ??
    DEFAULT_API_BASE_URL);

export function getApiToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setApiToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearApiToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = getApiToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;
  const textPayload = !isJson ? (await response.text()).trim() : "";

  if (!response.ok) {
    const fallbackMessage = `Request failed (${response.status})`;
    throw new Error(payload?.message || payload?.error || textPayload || fallbackMessage);
  }

  return payload as T;
}

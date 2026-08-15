export const DEFAULT_PRODUCTION_APP_URL = "https://proofly-omega.vercel.app";

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PRODUCTION_APP_URL,
} as const;

export function getApiUrl(path: string): string {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export function getPublicProfileUrl(username: string, customOrigin?: string): string {
  const base = (customOrigin || env.appUrl).replace(/\/$/, "");
  return `${base}/u/${encodeURIComponent(username)}`;
}

/**
 * Shared utility for resolving the Python backend base URL
 * from server-side API routes.
 */

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "";
  const normalized = normalizeBaseUrl(raw.trim());

  if (!normalized) {
    throw new Error(
      "Backend API base URL is not configured. Set BACKEND_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL."
    );
  }

  return normalized;
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Encode a relative path (e.g. "folder/a.pdf") for Next.js catch-all routes.
// We encode per-segment so "/" stays as a path separator.
export function encodePathSegments(relativePath: string) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}


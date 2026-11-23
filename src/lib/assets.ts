const BASE = (import.meta.env.VITE_ASSETS_URL || "/assets").replace(/\/+$/, "");

export function catalogUrl(): string {
  return `${BASE}/carpets.json`;
}

export function patternUrl(relPath: string): string {
  return `${BASE}/${relPath.replace(/^\/+/, "")}`;
}

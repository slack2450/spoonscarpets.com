const BASE = (import.meta.env.VITE_ASSETS_URL || "/assets").replace(/\/+$/, "");

export function catalogUrl(): string {
  return `${BASE}/carpets.json`;
}

export function patternUrl(relPath: string, version?: string): string {
  const url = `${BASE}/${relPath.replace(/^\/+/, "")}`;
  return version ? `${url}?v=${version.slice(0, 8)}` : url;
}

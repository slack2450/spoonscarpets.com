export interface ColorFamily {
  name: string;
  hex: string;
}

export const COLOR_FAMILIES: ColorFamily[] = [
  { name: "Burgundy", hex: "#7b1e2b" },
  { name: "Crimson", hex: "#b8292f" },
  { name: "Terracotta", hex: "#b45a3c" },
  { name: "Gold", hex: "#c89d46" },
  { name: "Emerald", hex: "#235c45" },
  { name: "Teal", hex: "#1f5f6b" },
  { name: "Navy", hex: "#1d3155" },
  { name: "Purple", hex: "#542c5c" },
  { name: "Charcoal", hex: "#2f3238" },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Weighted Euclidean RGB distance (redmean approximation for perceptual similarity)
export function colorDistance(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  );
}

export function bestPaletteDistance(palette: string[], targetHex: string): number {
  if (!palette.length) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const hex of palette) {
    const d = colorDistance(hex, targetHex);
    if (d < best) best = d;
  }
  return best;
}

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function exportWallpaperPng(
  svgUrl: string,
  filename: string,
  tileDisplayWidth = 260,
  outW = 1170,
  outH = 2532,
): Promise<void> {
  const res = await fetch(svgUrl);
  const svgText = await res.text();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const aspect = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    const drawW = Math.max(64, Math.round(tileDisplayWidth));
    const drawH = Math.max(64, Math.round(drawW * aspect));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");

    for (let y = 0; y < outH; y += drawH) {
      for (let x = 0; x < outW; x += drawW) {
        ctx.drawImage(img, x, y, drawW, drawH);
      }
    }

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("PNG export failed");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(pngBlob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

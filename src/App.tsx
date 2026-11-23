import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarpetUnfurl } from "./components/CarpetUnfurl";
import { ShuffleButton } from "./components/ShuffleButton";
import { SurpriseButton } from "./components/SurpriseButton";
import { useShuffleDeal } from "./components/useShuffleDeal";
import { catalogUrl, patternUrl } from "./lib/assets";
import {
  bestPaletteDistance,
  COLOR_FAMILIES,
  exportWallpaperPng,
  haversineMiles,
} from "./lib/colors";
import type { CarpetCatalog, CarpetPub } from "./types";

const BATCH_SIZE = 36;

function PinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState<CarpetCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"carpeted" | "all" | "noCarpet">("carpeted");
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const gridRef = useShuffleDeal(shuffleKey, headerRef);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const [selected, setSelected] = useState<CarpetPub | null>(null);
  const [closingModal, setClosingModal] = useState(false);
  const [tileZoom, setTileZoom] = useState(140);
  const [floorMode, setFloorMode] = useState(false);
  const [driftOn, setDriftOn] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [exportingWallpaper, setExportingWallpaper] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const finishClose = useCallback(() => {
    setSelected(null);
    setClosingModal(false);
  }, []);

  const requestClose = useCallback(() => {
    if (!selected || closingModal) return;
    if (floorMode || !(selected.pattern || selected.floor)) finishClose();
    else setClosingModal(true);
  }, [selected, closingModal, floorMode, finishClose]);

  const flashToast = useCallback((msg: string) => {
    setCopiedToast(msg);
    window.setTimeout(() => setCopiedToast((cur) => (cur === msg ? null : cur)), 2200);
  }, []);

  useEffect(() => {
    fetch(catalogUrl())
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CarpetCatalog>;
      })
      .then((data) => {
        setCatalog(data);
        const refParam = new URLSearchParams(window.location.search).get("pub");
        if (refParam) {
          const match = data.pubs.find((p) => p.ref === refParam);
          if (match) setSelected(match);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) {
      url.searchParams.set("pub", selected.ref);
      document.title = `${selected.name}${selected.town ? ` (${selected.town})` : ""} — SpoonsCarpets.com`;
    } else {
      url.searchParams.delete("pub");
      setFloorMode(false);
      setDevOpen(false);
      document.title = "SpoonsCarpets.com — Every Wetherspoons carpet";
    }
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (floorMode) setFloorMode(false);
        else requestClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, floorMode, requestClose]);

  const distanceMap = useMemo(() => {
    if (!catalog || !userLoc) return null;
    const m = new Map<string, number>();
    for (const p of catalog.pubs) {
      if (p.lat != null && p.lng != null) {
        m.set(p.ref, haversineMiles(userLoc.lat, userLoc.lng, p.lat, p.lng));
      }
    }
    return m;
  }, [catalog, userLoc]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    let list = catalog.pubs.filter((p) => {
      if (filter === "carpeted" && !p.pattern) return false;
      if (filter === "noCarpet" && !p.noCarpet) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.town.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q) ||
        p.postcode.toLowerCase().includes(q) ||
        p.ref === q ||
        (p.noCarpetNote?.toLowerCase().includes(q) ?? false)
      );
    });

    if (activeColor) {
      list = [...list]
        .filter((p) => (p.pattern?.colors.length || p.floor?.colors.length || 0) > 0)
        .sort((a, b) => {
          const pa = a.pattern?.colors ?? a.floor?.colors ?? [];
          const pb = b.pattern?.colors ?? b.floor?.colors ?? [];
          return bestPaletteDistance(pa, activeColor) - bestPaletteDistance(pb, activeColor);
        });
    } else if (distanceMap) {
      list = [...list].sort(
        (a, b) =>
          (distanceMap.get(a.ref) ?? Number.POSITIVE_INFINITY) -
          (distanceMap.get(b.ref) ?? Number.POSITIVE_INFINITY),
      );
    } else if (shuffleSeed !== null) {
      list = [...list];
      let s = shuffleSeed;
      for (let i = list.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const j = s % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    return list;
  }, [catalog, query, filter, activeColor, distanceMap, shuffleSeed]);

  const lastShuffle = useRef(shuffleKey);
  useEffect(() => {
    // Keep the loaded rows under the sticky header when shuffling mid-scroll.
    if (lastShuffle.current === shuffleKey) setVisibleCount(BATCH_SIZE);
    lastShuffle.current = shuffleKey;
  }, [query, filter, activeColor, userLoc, shuffleKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => (n < filtered.length ? Math.min(filtered.length, n + BATCH_SIZE) : n));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const handleNearMe = () => {
    if (userLoc) {
      setUserLoc(null);
      return;
    }
    if (!navigator.geolocation) {
      flashToast("Geolocation unavailable in this browser");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setActiveColor(null);
        setShuffleSeed(null);
        setLocLoading(false);
      },
      () => {
        setLocLoading(false);
        flashToast("Location permission denied");
      },
      { timeout: 8000 },
    );
  };

  const handleSurpriseMe = () => {
    const pool = filtered.length ? filtered : catalog?.pubs ?? [];
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelected(pick);
  };

  const tabs: Array<{ id: "carpeted" | "noCarpet" | "all"; label: string }> = [
    { id: "carpeted", label: `Carpets (${catalog?.meta.vectorizedPubs ?? 768})` },
    { id: "noCarpet", label: `No Carpet (${catalog?.meta.noCarpetPubs ?? 8})` },
    { id: "all", label: "All" },
  ];

  const shown = filtered.slice(0, visibleCount);
  const selectedSvgPath = selected?.pattern?.path ?? selected?.floor?.path ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <header ref={headerRef} className="sticky top-0 z-20 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Top bar: Brand + sleek icon/label actions */}
            <div className="flex items-center justify-between gap-2">
              <h1 className="m-0 inline-flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveColor(null);
                    setUserLoc(null);
                    setShuffleSeed(null);
                    setFilter("carpeted");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="font-brand cursor-pointer whitespace-nowrap pb-[0.08em] text-[1.35rem] leading-[1.25] tracking-[-0.02em] text-white transition-opacity hover:opacity-90 active:scale-[0.98] [text-shadow:0_10px_22px_rgba(0,0,0,0.28)] sm:text-[1.6rem]"
                >
                  SpoonsCarpets.com
                </button>
              </h1>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <ShuffleButton
                  shuffleKey={shuffleKey}
                  onShuffle={() => {
                    setShuffleSeed(Math.floor(Math.random() * 0x100000000));
                    setShuffleKey((key) => key + 1);
                    setActiveColor(null);
                    setUserLoc(null);
                  }}
                />

                <SurpriseButton onSurprise={handleSurpriseMe} />

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={handleNearMe}
                  disabled={locLoading}
                  aria-label={userLoc ? "Disable Near Me sorting" : "Sort by nearest pub"}
                  title={userLoc ? "Near Me active (click to clear)" : "Near Me"}
                  className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs transition-colors ${
                    userLoc
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white"
                  }`}
                >
                  <PinIcon className={`h-3.5 w-3.5 ${locLoading ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">
                    {locLoading ? "Locating…" : userLoc ? "Near Me ✓" : "Near Me"}
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Search + Animated Sliding Tabs */}
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pub, town, county, postcode..."
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-base text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-amber-500/60 focus:outline-none sm:flex-1 sm:text-sm"
              />

              <div className="relative grid grid-cols-3 rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-xs sm:w-80 sm:shrink-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-md bg-amber-500/20 ring-1 ring-amber-400/25 transition-transform duration-200 ease-out"
                  style={{
                    transform: `translateX(${tabs.findIndex((t) => t.id === filter) * 100}%)`,
                  }}
                />
                {tabs.map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`relative z-10 whitespace-nowrap rounded-md px-2 py-1.5 text-center transition-colors sm:py-1 ${
                        active ? "font-medium text-amber-200" : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colour filter bar — single scrollable row on mobile */}
            <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {COLOR_FAMILIES.map((c) => {
                const isSelected = activeColor?.toLowerCase() === c.hex.toLowerCase();
                return (
                  <motion.button
                    key={c.name}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setActiveColor(isSelected ? null : c.hex);
                      setUserLoc(null);
                      setShuffleSeed(null);
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                      isSelected
                        ? "border-amber-400 bg-amber-500/15 text-amber-200"
                        : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-white/20"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </motion.button>
                );
              })}
              {activeColor && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setActiveColor(null)}
                  className="ml-1 shrink-0 rounded-full border border-neutral-700 px-2.5 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-500"
                >
                  Clear ({activeColor}) ×
                </motion.button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
              Failed to load catalog: {error}
            </div>
          )}

          <AnimatePresence>
            {filter === "noCarpet" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs text-neutral-300"
              >
                <strong className="text-amber-300">The 8 Carpet-Free Rebels:</strong> Every other UK
                Wetherspoon has a bespoke Axminster carpet. These 8 venues are confirmed hard-floor
                only — each rendered below with a seamless tile matched to its real floor.
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={gridRef} className="grid grid-cols-2 gap-3 [overflow-anchor:none] sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {shown.map((pub, idx) => {
              const dist = distanceMap?.get(pub.ref);
              const palette = pub.pattern?.colors ?? pub.floor?.colors ?? [];
              const staggerDelay = Math.min((idx % BATCH_SIZE) * 18, 220);
              return (
                <div
                  key={pub.ref}
                  onClick={() => setSelected(pub)}
                  role="button"
                  tabIndex={0}
                  style={{ animationDelay: `${staggerDelay}ms` }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(pub);
                    }
                  }}
                  className={`${shuffleSeed === null ? "card-reveal " : ""}group cursor-pointer overflow-hidden rounded-xl border border-neutral-800/90 bg-neutral-900/70 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-600 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)] active:scale-[0.98]`}
                >
                  <div className="relative h-36 w-full overflow-hidden bg-neutral-900 sm:h-48">
                    {pub.pattern ? (
                      <img
                        src={patternUrl(pub.pattern.thumb || pub.pattern.path)}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (pub.pattern && !img.dataset.fallback) {
                            img.dataset.fallback = "1";
                            img.src = patternUrl(pub.pattern.path);
                          }
                        }}
                        alt={`${pub.name} carpet pattern`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : pub.floor ? (
                      <div
                        className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
                        style={{
                          backgroundImage: `url(${patternUrl(pub.floor.path)})`,
                          backgroundRepeat: "repeat",
                          backgroundSize: "110px auto",
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-900/90 px-3 text-center text-xs text-neutral-500">
                        Confirmed carpet-free
                      </div>
                    )}

                    {pub.noCarpet && (
                      <span className="absolute top-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-md border border-amber-400/30 bg-neutral-950/85 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur sm:top-2 sm:left-2 sm:px-2">
                        {pub.floor?.material || "Hard Floor"}
                      </span>
                    )}

                    {dist != null && (
                      <span className="absolute right-1.5 bottom-1.5 rounded-md bg-neutral-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 backdrop-blur sm:right-2 sm:bottom-2">
                        {dist < 10 ? dist.toFixed(1) : Math.round(dist)} mi
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3">
                    <div className="truncate text-xs font-semibold text-neutral-100 sm:text-sm">
                      {pub.name}
                    </div>
                    <div className="truncate text-[11px] text-neutral-400 sm:text-xs">
                      {pub.town}
                      {pub.county && pub.county !== pub.town ? `, ${pub.county}` : ""}
                    </div>

                    {pub.noCarpet && pub.noCarpetNote && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-neutral-400 sm:mt-1.5 sm:text-[11px]">
                        {pub.noCarpetNote}
                      </p>
                    )}

                    {palette.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        {palette.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            title={`Find carpets matching ${hex}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColor(hex);
                              setUserLoc(null);
                              setShuffleSeed(null);
                            }}
                            className="h-3 w-3 rounded-sm border border-white/15 transition-transform hover:scale-125 sm:h-3.5 sm:w-3.5"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <span className="ml-auto hidden font-mono text-[10px] text-neutral-500 sm:inline">
                          #{pub.ref}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} className="mt-6 flex justify-center py-4 text-xs text-neutral-500">
            {visibleCount < filtered.length
              ? `Loading more (${visibleCount} of ${filtered.length})...`
              : filtered.length > 0
                ? `All ${filtered.length} shown`
                : catalog
                  ? "No matching pubs found."
                  : ""}
          </div>
        </main>

        {/* Fullscreen Floor Mode */}
        <AnimatePresence>
          {selected && floorMode && selectedSvgPath && (
            <motion.div
              key="floor-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className={`fixed inset-0 z-[60] ${driftOn ? "floor-drift" : ""}`}
              style={{
                backgroundImage: `url(${patternUrl(selectedSvgPath)})`,
                backgroundRepeat: "repeat",
                backgroundSize: `${tileZoom}px auto`,
              }}
            >
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="fixed bottom-5 left-1/2 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center justify-between gap-2.5 rounded-full border border-neutral-700/80 bg-neutral-950/90 px-4 py-2.5 text-xs shadow-2xl backdrop-blur"
              >
                <span className="truncate font-semibold text-neutral-100">{selected.name}</span>
                <input
                  type="range"
                  aria-label="Tile zoom"
                  min={48}
                  max={360}
                  value={tileZoom}
                  onChange={(e) => setTileZoom(Number(e.target.value))}
                  className="w-20 shrink-0 accent-amber-400 sm:w-24"
                />
                <button
                  type="button"
                  onClick={() => setDriftOn((d) => !d)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    driftOn
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {driftOn ? "Drift" : "Still"}
                </button>
                <button
                  type="button"
                  onClick={() => setFloorMode(false)}
                  className="shrink-0 rounded-full bg-neutral-800 px-3 py-1 text-neutral-200 hover:bg-neutral-700"
                >
                  Exit
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inspector Modal / Bottom Sheet */}
        <AnimatePresence>
          {selected && !floorMode && (
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={(event) => {
                if (event.target === event.currentTarget) requestClose();
              }}
            >
              <div className="pointer-events-none max-h-[92dvh] w-full max-w-3xl overflow-y-auto">
                {selectedSvgPath ? (
                  <CarpetUnfurl
                    key={selected.ref}
                    imageUrl={patternUrl(selectedSvgPath)}
                    tileZoom={tileZoom}
                    isHardFloor={Boolean(selected.noCarpet)}
                    closing={closingModal}
                    onRolledUp={finishClose}
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      disabled={closingModal}
                      onClick={() => setFloorMode(true)}
                      className="absolute right-3 bottom-3 z-20 rounded-lg border border-neutral-700/80 bg-neutral-950/85 px-3 py-1.5 text-xs font-medium text-neutral-100 backdrop-blur hover:border-neutral-500"
                    >
                      Fullscreen Floor Mode
                    </motion.button>
                  </CarpetUnfurl>
                ) : (
                  <div className="pointer-events-auto flex h-52 items-center justify-center rounded-t-2xl bg-neutral-900 p-6 text-center text-sm text-neutral-400">
                    {selected.noCarpetNote || "Confirmed carpet-free."}
                  </div>
                )}

                <div className="pointer-events-auto space-y-3 border border-neutral-800 bg-neutral-950 p-4 pb-6 sm:rounded-b-2xl sm:pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold sm:text-lg">{selected.name}</h2>
                        {selected.noCarpet && (
                          <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                            {selected.floor?.material || "Hard Floor"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {selected.town}
                        {selected.county && selected.county !== selected.town ? `, ${selected.county}` : ""}{" "}
                        · {selected.postcode} · #{selected.ref}
                      </p>
                      {selected.noCarpetNote && (
                        <p className="mt-1.5 text-xs text-neutral-300">{selected.noCarpetNote}</p>
                      )}
                    </div>

                    <a
                      href="https://spoons.cheap"
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-600"
                    >
                      spoons.cheap ↗
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(selected.pattern?.colors ?? selected.floor?.colors ?? []).map((hex) => (
                      <motion.button
                        key={hex}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          setActiveColor(hex);
                          finishClose();
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-[11px] text-neutral-300 transition-colors hover:border-neutral-600"
                        title="Sort archive by this colour"
                      >
                        <span
                          className="h-3 w-3 rounded-sm border border-white/15"
                          style={{ backgroundColor: hex }}
                        />
                        {hex}
                      </motion.button>
                    ))}
                  </div>

                  {selectedSvgPath && (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-neutral-400">Zoom</span>
                      <input
                        type="range"
                        min={48}
                        max={360}
                        value={tileZoom}
                        onChange={(e) => setTileZoom(Number(e.target.value))}
                        className="flex-1 accent-amber-400"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                    {selectedSvgPath && (
                      <>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          disabled={exportingWallpaper}
                          onClick={async () => {
                            try {
                              setExportingWallpaper(true);
                              await exportWallpaperPng(
                                patternUrl(selectedSvgPath),
                                `spoonscarpets-${selected.ref}-wallpaper.png`,
                                Math.round(tileZoom * 1.8),
                              );
                              flashToast("Phone wallpaper downloaded!");
                            } catch {
                              flashToast("Wallpaper export failed");
                            } finally {
                              setExportingWallpaper(false);
                            }
                          }}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 sm:py-1.5"
                        >
                          {exportingWallpaper ? "Rendering..." : "Phone Wallpaper"}
                        </motion.button>

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={async () => {
                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: `${selected.name} — SpoonsCarpets.com`,
                                  url: window.location.href,
                                });
                                return;
                              } catch {
                                // User cancelled or share failed; fall through to clipboard
                              }
                            }
                            navigator.clipboard.writeText(window.location.href);
                            flashToast("Share link copied!");
                          }}
                          className="rounded-lg bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-neutral-950 hover:bg-amber-400 sm:py-1.5"
                        >
                          Share Link
                        </motion.button>

                        <button
                          type="button"
                          onClick={() => setDevOpen((o) => !o)}
                          className={`rounded-lg border px-3 py-2 text-xs transition-colors sm:py-1.5 ${
                            devOpen
                              ? "border-neutral-500 bg-neutral-800 text-neutral-100"
                              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                          }`}
                        >
                          {devOpen ? "Dev ▴" : "Dev ▾"}
                        </button>
                      </>
                    )}

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={requestClose}
                      className={`rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-500 sm:py-1.5 ${
                        selectedSvgPath ? "" : "col-span-2 sm:col-span-1"
                      }`}
                    >
                      Close
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {devOpen && selectedSvgPath && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs">
                          <span className="font-mono text-[11px] text-neutral-400">
                            {selected.pattern
                              ? `${selected.pattern.width}×${selected.pattern.height} · ${(selected.pattern.bytes / 1024).toFixed(1)} KB`
                              : selected.floor
                                ? `${selected.floor.width}×${selected.floor.height} · ${(selected.floor.bytes / 1024).toFixed(1)} KB`
                                : ""}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={patternUrl(selectedSvgPath)}
                              download={`${selected.ref}.svg`}
                              className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-[11px] text-neutral-200 hover:border-neutral-500"
                            >
                              Download SVG
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const css = `background-image: url("${patternUrl(selectedSvgPath)}"); background-repeat: repeat; background-size: ${tileZoom}px auto;`;
                                navigator.clipboard.writeText(css);
                                flashToast("CSS copied!");
                              }}
                              className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-neutral-500"
                            >
                              Copy CSS
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Toast */}
        <AnimatePresence>
          {copiedToast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="fixed right-4 bottom-4 z-[70] rounded-lg border border-neutral-700 bg-neutral-900/95 px-3.5 py-2 text-xs font-medium text-neutral-100 shadow-xl backdrop-blur"
            >
              {copiedToast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

interface CarpetUnfurlProps {
  imageUrl: string;
  tileZoom: number;
  isHardFloor?: boolean;
  closing: boolean;
  onRolledUp: () => void;
  children?: ReactNode;
}

export function CarpetUnfurl({
  imageUrl,
  tileZoom,
  isHardFloor = false,
  closing,
  onRolledUp,
  children,
}: CarpetUnfurlProps) {
  const reducedMotion = useReducedMotion();
  const skipUnfurl = Boolean(reducedMotion || isHardFloor);
  const [imageState, setImageState] = useState<"loading" | "ready" | "failed">("loading");
  const progress = useMotionValue(skipUnfurl ? 1 : 0);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.src = imageUrl;
    image.decode().then(
      () => { if (active) setImageState("ready"); },
      () => { if (active) setImageState("failed"); },
    );
    return () => { active = false; };
  }, [imageUrl]);

  useEffect(() => {
    const target = closing ? 0 : 1;
    if (skipUnfurl || imageState === "failed") {
      if (closing) onRolledUp();
      else progress.set(1);
      return;
    }
    if (!closing && imageState !== "ready") return;

    const distance = Math.abs(target - progress.get());
    if (distance === 0) {
      if (closing) onRolledUp();
      return;
    }
    const animation = animate(progress, target, {
      duration: (closing ? 0.48 : 0.72) * Math.sqrt(distance),
      ease: [0.42, 0, 0.28, 1],
      onComplete: closing ? onRolledUp : undefined,
    });
    return () => animation.stop();
  }, [closing, imageState, onRolledUp, progress, skipUnfurl]);

  // Moving the clip and counter-moving its contents keeps each laid tile fixed to the panel.
  const edgeY = useTransform(progress, [0, 1], ["100%", "0%"]);
  const surfaceY = useTransform(progress, [0, 1], ["-100%", "0%"]);
  const rollScale = useTransform(progress, (p) => Math.pow(Math.max(0, 1 - p), 0.45));
  const rollShadowOpacity = useTransform(progress, [0, 0.85, 1], [1, 0.9, 0]);
  const rollTextureY = useTransform(progress, [0, 1], [-180, 0]);
  const texture = {
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: `${tileZoom}px auto`,
    backgroundRepeat: "repeat",
  };

  return (
    <div className="pointer-events-none relative h-64 w-full overflow-hidden sm:h-96">
      <motion.div
        className="pointer-events-auto absolute inset-0 overflow-hidden rounded-t-2xl"
        style={{ y: edgeY }}
      >
        {imageState === "failed" ? (
          <div className="grid h-full place-items-center bg-neutral-900 text-sm text-neutral-400">
            Preview unavailable
          </div>
        ) : (
          <motion.div className="absolute inset-0" style={{ ...texture, y: surfaceY }}>
            {children}
          </motion.div>
        )}
        {!skipUnfurl && imageState === "ready" && (
          <>
            {/* Deep contact shadow cast by the rolled carpet onto the laid floor */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-14 origin-top bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.36)_45%,transparent_100%)]"
              style={{ scaleY: rollScale, opacity: rollShadowOpacity }}
            />
            {/* 3D cylindrical rolling carpet bar */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-10 origin-top overflow-hidden border-b border-black/70 shadow-[0_10px_22px_rgba(0,0,0,0.75)]"
              style={{ scaleY: rollScale }}
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-[240px]"
                style={{ ...texture, y: rollTextureY }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(255,255,255,0.28)_28%,rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.32)_76%,rgba(0,0,0,0.82)_100%)]" />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

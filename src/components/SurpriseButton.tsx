import { useEffect, useRef, useState } from "react";

const symbols = [
  <circle cx="1.25" cy="2.5" r=".9" />,
  <path d="m1.25 1 1.1 1.5-1.1 1.5L.15 2.5Z" />,
  <rect x=".35" y="1.9" width="1.8" height="1.2" rx=".25" />,
];

export function SurpriseButton({ onSurprise }: { onSurprise: () => void }) {
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pullLever() {
    if (timer.current !== undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onSurprise();
      return;
    }

    setSpinning(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setSpinning(false);
      onSurprise();
    }, 220);
  }

  return (
    <button
      type="button"
      onClick={pullLever}
      aria-label="Surprise me with a random carpet"
      title="Surprise Me"
      className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4 shrink-0" data-spinning={spinning || undefined}>
        <rect x=".75" y="3" width="11.25" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
        <path d="M4 11.5h4.75M12 9.5h2.25" fill="none" stroke="currentColor" strokeLinecap="round" />
        {symbols.map((symbol, index) => (
          <svg key={index} x={2 + index * 3.15} y="5" width="2.5" height="5" overflow="hidden">
            <rect width="2.5" height="5" rx=".6" opacity=".25" />
            <g className="slot-reel" style={{ animationDelay: `${index * 16}ms` }}>
              {symbol}
              <g transform="translate(0 -5)">{symbols[(index + 1) % symbols.length]}</g>
              <g transform="translate(0 -10)">{symbol}</g>
            </g>
          </svg>
        ))}
        <path className="slot-arm" d="M14.25 9.5V5" stroke="currentColor" strokeWidth="1.25" />
        <circle className="slot-knob" cx="14.25" cy="5" r="1.4" />
      </svg>
      <span className="hidden sm:inline">Surprise</span>
    </button>
  );
}

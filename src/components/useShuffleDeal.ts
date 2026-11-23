import { useLayoutEffect, useRef, type RefObject } from "react";

export function useShuffleDeal(shuffleKey: number, headerRef: RefObject<HTMLElement>) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !shuffleKey || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const top = headerRef.current?.getBoundingClientRect().bottom ?? 0;
    const bottom = window.innerHeight;
    const visible: Element[] = [];
    // Read the new card positions together, before starting any animations.
    for (const card of grid.children) {
      const bounds = card.getBoundingClientRect();
      if (bounds.top >= bottom) break;
      if (bounds.bottom > top) visible.push(card);
    }

    const animations = visible.map((card, index) => {
      const side = (shuffleKey + index) % 2 === 0 ? 1 : -1;
      return card.animate(
        [
          { transform: `translate(${side * 5}px, 9px) rotate(${side * 0.8}deg) scale(.985)`, opacity: 0.65 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 265, delay: Math.min(index * 14, 105), easing: "cubic-bezier(.2,.8,.25,1)", fill: "backwards" },
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [shuffleKey, headerRef]);

  return gridRef;
}

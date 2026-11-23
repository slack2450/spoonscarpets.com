type Props = {
  shuffleKey: number;
  onShuffle: () => void;
};

export function ShuffleButton({ shuffleKey, onShuffle }: Props) {
  return (
    <button
      type="button"
      onClick={onShuffle}
      aria-label="Shuffle carpets"
      title="Shuffle"
      className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 text-xs text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white active:bg-neutral-800"
    >
      <svg
        key={shuffleKey}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-3.5"
        data-shuffling={shuffleKey > 0 || undefined}
      >
        <g className="shuffle-strand">
          <path d="M4 20 21 3" className="shuffle-shaft" />
          <path d="M16 3h5v5" />
        </g>
        <g className="shuffle-strand shuffle-strand-down">
          <path d="M4 4 9 9 M15 15 21 21" className="shuffle-shaft" />
          <path d="M21 16v5h-5" />
        </g>
      </svg>
      <span className="hidden sm:inline">Shuffle</span>
    </button>
  );
}

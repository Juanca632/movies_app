import type { ReactNode } from "react";

/** A toggle pill for filters: genres, release kinds... */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active ? "border-accent bg-accent text-bg" : "border-white/10 bg-surface/60 text-muted hover:border-white/25 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

export default Chip;

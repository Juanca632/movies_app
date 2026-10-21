import type { MediaType } from "../api/types";
import { openTrailer } from "../lib/trailer";
import { PlayIcon } from "./icons";

interface TrailerButtonProps {
  mediaType: MediaType;
  id: number;
  title: string;
  label?: string;
  /** The page's main action (a white "play" button), rather than glass over artwork. */
  solid?: boolean;
  className?: string;
}

function TrailerButton({ mediaType, id, title, label = "Watch trailer", solid = false, className = "" }: TrailerButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openTrailer({ mediaType, id, title })}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition active:scale-[0.97] ${
        solid ? "bg-fg text-bg hover:bg-fg/85" : "bg-white/10 text-fg ring-1 ring-white/15 backdrop-blur-sm hover:bg-white/20"
      } ${className}`}
    >
      <PlayIcon className="size-4" />
      {label}
    </button>
  );
}

export default TrailerButton;

import type { MediaType } from "../api/types";
import { openTrailer } from "../lib/trailer";
import { PlayIcon } from "./icons";

interface TrailerButtonProps {
  mediaType: MediaType;
  id: number;
  title: string;
  label?: string;
  className?: string;
}

function TrailerButton({ mediaType, id, title, label = "Watch trailer", className = "" }: TrailerButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openTrailer({ mediaType, id, title })}
      className={`inline-flex items-center gap-2 rounded-full bg-white/10 font-semibold text-fg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/20 ${className}`}
    >
      <PlayIcon className="size-4" />
      {label}
    </button>
  );
}

export default TrailerButton;

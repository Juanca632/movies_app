import { formatRating } from "../lib/tmdb";
import { StarIcon } from "./icons";

function Rating({ value, className = "" }: { value: number; className?: string }) {
  const rating = formatRating(value);
  if (!rating) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      <StarIcon className="size-[1em] text-accent" />
      {rating}
      <span className="sr-only">out of 10</span>
    </span>
  );
}

export default Rating;

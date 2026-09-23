import { useRegions } from "../api/queries";
import { setRegion, useRegion } from "../lib/region";
import { ChevronDownIcon, GlobeIcon } from "./icons";

/** Country switcher: a native select (accessible, mobile-friendly) under a compact label. */
function RegionPicker() {
  const region = useRegion();
  const { data: regions } = useRegions();
  // Keep the current country selectable even before the list loads or if TMDB lacks it.
  const options = regions?.some((r) => r.code === region) ? regions : [{ code: region, name: region }, ...(regions ?? [])];

  return (
    <label className="relative flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-surface/80 py-2 pl-2.5 pr-2 text-xs font-semibold text-fg transition focus-within:border-accent/70 hover:border-white/25">
      <GlobeIcon className="size-4 text-subtle" />
      <span aria-hidden>{region}</span>
      <ChevronDownIcon className="size-3.5 text-subtle" />
      <select
        aria-label="Country"
        title="Country for streaming availability"
        value={region}
        onChange={(event) => setRegion(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {options.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default RegionPicker;

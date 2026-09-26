import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRegionName, useRegions } from "../api/queries";
import { flagUrl } from "../lib/flags";
import { setRegion, useRegion } from "../lib/region";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "./icons";

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Flag({ code, className = "" }: { code: string; className?: string }) {
  const src = flagUrl(code);
  return src ? (
    <img src={src} alt="" loading="lazy" className={`aspect-[4/3] shrink-0 rounded-[3px] object-cover ring-1 ring-white/10 ${className}`} />
  ) : (
    <span aria-hidden className={`aspect-[4/3] shrink-0 rounded-[3px] bg-surface-2 ${className}`} />
  );
}

/** Country switcher: a pill that opens a searchable list of countries with their flags. */
function RegionPicker() {
  const region = useRegion();
  const regionName = useRegionName(region);
  const { data: regions, isError, refetch } = useRegions();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const term = normalize(filter.trim());
    return (regions ?? []).filter((r) => !term || normalize(r.name).includes(term) || r.code.toLowerCase() === term);
  }, [regions, filter]);

  // Every time the list opens it starts on the current country, with an empty filter.
  const openList = () => {
    setFilter("");
    setActive(Math.max(0, regions?.findIndex((r) => r.code === region) ?? 0));
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  };

  const choose = (code: string) => {
    setRegion(code);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted country visible while moving with the keyboard.
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!matches.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (matches[active]) choose(matches[active].code);
    }
  };

  const optionId = (code: string) => `${listId}-${code}`;

  return (
    <div ref={container} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={`Country: ${regionName}`}
        title="Country for streaming availability"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openList())}
        className={`flex items-center gap-1.5 rounded-full border bg-surface/80 py-2 pl-2.5 pr-2 text-xs font-semibold text-fg transition hover:border-white/25 ${
          open ? "border-accent/70" : "border-white/10"
        }`}
      >
        <Flag code={region} className="w-5" />
        <span className="hidden sm:inline">{region}</span>
        <ChevronDownIcon className={`size-3.5 text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose your country"
          className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-surface/95 shadow-2xl shadow-black/60 backdrop-blur-md"
        >
          <div className="border-b border-white/5 p-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input
                autoFocus
                type="text"
                role="combobox"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setActive(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search country…"
                aria-label="Search country"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={matches[active] ? optionId(matches[active].code) : undefined}
                autoComplete="off"
                className="w-full rounded-lg border border-white/10 bg-bg/60 py-1.5 pl-9 pr-3 text-sm text-fg placeholder-subtle outline-none transition focus:border-accent/70"
              />
            </div>
          </div>

          <ul ref={list} id={listId} role="listbox" aria-label="Countries" className="max-h-80 overflow-y-auto overscroll-contain py-1">
            {matches.map((r, i) => {
              const selected = r.code === region;
              return (
                <li
                  key={r.code}
                  id={optionId(r.code)}
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(r.code)}
                  onMouseMove={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${i === active ? "bg-accent/15" : ""} ${
                    selected ? "font-semibold text-accent" : "text-fg"
                  }`}
                >
                  <Flag code={r.code} className="w-6" />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {selected && <CheckIcon className="size-4" />}
                </li>
              );
            })}
          </ul>

          {!matches.length && (
            <div className="px-3 py-3 text-sm text-subtle">
              {isError ? (
                <button type="button" onClick={() => refetch()} className="text-muted hover:text-accent">
                  Couldn't load countries. Try again
                </button>
              ) : regions ? (
                "No country matches."
              ) : (
                "Loading countries…"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RegionPicker;

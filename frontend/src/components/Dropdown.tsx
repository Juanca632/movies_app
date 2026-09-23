import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

/**
 * A select-only combobox styled like the rest of the app. Unlike a native <select>, picking an
 * option applies it and closes at once on every device (iOS keeps its picker open until "Done").
 */
function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-option-${i}`;

  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const choose = (option: DropdownOption) => {
    if (option.value !== value) onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={container} className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
      <span id={labelId} title={label} className="mb-1.5 block truncate text-xs font-semibold uppercase tracking-wider text-subtle">
        {label}
      </span>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleButtonKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-full border bg-surface py-2 pl-4 pr-3 text-left text-sm font-medium text-fg transition hover:border-white/25 ${
          open ? "border-accent/70" : "border-white/10"
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDownIcon className={`size-4 shrink-0 text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Never wider than its column on phones: overflowing the screen makes mobile browsers zoom out. */}
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-surface/95 py-1 shadow-2xl shadow-black/60 outline-none backdrop-blur-md sm:right-auto sm:min-w-full sm:w-max sm:max-w-80"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors ${i === active ? "bg-accent/15" : ""} ${
                  isSelected ? "font-semibold text-accent" : "text-fg"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <CheckIcon className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;

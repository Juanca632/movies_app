import { NavLink } from "react-router-dom";
import { useAskPanel } from "../lib/askPanel";
import { AiSparkIcon, CalendarIcon, FilmIcon, HomeIcon, TvIcon } from "./icons";

const TABS = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/browse/movie", label: "Movies", Icon: FilmIcon },
  null, // the assistant, in the middle
  { to: "/browse/tv", label: "TV", Icon: TvIcon },
  { to: "/calendar", label: "Calendar", Icon: CalendarIcon },
];

const tabClass =
  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition active:scale-95 active:opacity-70";

/** Phones only: app-style tab bar. The assistant sits in the middle, marked by its AI icon. */
function BottomNav() {
  const assistant = useAskPanel();

  return (
    <nav
      aria-label="Sections"
      // Clear of the home indicator, and of the notch when the phone is sideways. Taps never select
      // the labels, and a long-press doesn't open the link menu.
      className="fixed inset-x-0 bottom-0 z-50 select-none border-t border-white/5 bg-bg/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur-md [-webkit-touch-callout:none] sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {TABS.map((tab) =>
          tab ? (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === "/"}
                // The whole cell is the target, not just the icon and label.
                className={({ isActive }) => `${tabClass} ${isActive ? "text-fg" : "text-subtle"}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${isActive ? "bg-accent/15 text-accent" : ""}`}>
                      <tab.Icon className="size-5" />
                    </span>
                    {tab.label}
                  </>
                )}
              </NavLink>
            </li>
          ) : (
            <li key="ask">
              <button
                type="button"
                aria-expanded={assistant.open}
                onClick={() => (assistant.open ? assistant.close() : assistant.openPanel())}
                className={`${tabClass} w-full ${assistant.open ? "text-fg" : "text-subtle"}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${assistant.open ? "bg-white/10" : ""}`}>
                  <AiSparkIcon className="size-5" />
                </span>
                Ask AI
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

export default BottomNav;

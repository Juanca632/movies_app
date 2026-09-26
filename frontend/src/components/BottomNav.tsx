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

/** Phones only: app-style tab bar. The assistant sits in the middle, marked by its AI icon. */
function BottomNav() {
  const assistant = useAskPanel();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5 items-center">
        {TABS.map((tab) =>
          tab ? (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${isActive ? "text-fg" : "text-subtle"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.Icon className={`size-5 ${isActive ? "text-accent" : ""}`} />
                    {tab.label}
                  </>
                )}
              </NavLink>
            </li>
          ) : (
            <li key="ask" className="flex justify-center">
              <button
                type="button"
                aria-expanded={assistant.open}
                onClick={() => (assistant.open ? assistant.close() : assistant.openPanel())}
                className={`flex flex-col items-center gap-1 text-[11px] font-medium ${assistant.open ? "text-fg" : "text-subtle"}`}
              >
                <AiSparkIcon className="size-5" />
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
